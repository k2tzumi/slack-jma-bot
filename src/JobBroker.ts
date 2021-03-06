type Cache = GoogleAppsScript.Cache.Cache;
type Trigger = GoogleAppsScript.Script.Trigger;
type JobFunction = (parameter: Record<string, any>) => void;

interface JobParameter {
  id: string;
  state: string;
  scheduled_at?: number;
  start_at?: number;
  end_at?: number;
  created_at: number;
  handler: string;
  parameter: string;
}

type Job = { parameter: JobParameter; trigger: Trigger };

const MAX_SLOT = 10;
const DELAY_DURATION = 150;
// 1 Hour
const JOB_EXECUTE_TIME_OUT = 3600;
/**
 * 15 min
 * see. https://developers.google.com/apps-script/reference/script/clock-trigger-builder#atdateyear,-month,-day
 */
const JOB_STARTING_TIME_OUT = 900;

class JobBroker {
  private queue: Cache;
  private triggers: Trigger[];

  public constructor() {
    this.queue = CacheService.getScriptCache();
    this.triggers = ScriptApp.getProjectTriggers();
  }

  public enqueue(callback: JobFunction, parameter: Record<string, any>): void {
    if (callback.name === "anonymous") {
      throw new Error("Unsupport anonymous callback function.");
    }
    if (this.triggers.length > MAX_SLOT) {
      throw new Error("Busy.");
    }

    this.saveJob(this.createJob(callback, parameter));
  }

  public dequeue(handler: string): Job | null {
    let waitJob: Job | undefined;

    for (const trigger of this.triggers) {
      if (trigger.getTriggerSource() !== ScriptApp.TriggerSource.CLOCK) {
        continue;
      }

      const parameter = this.getJobParameter(trigger);
      if (parameter) {
        if (!this.isExpire(parameter)) {
          if (parameter.state === "waiting" && handler === parameter.handler) {
            if (
              !parameter.scheduled_at ||
              (parameter.scheduled_at && parameter.scheduled_at <= this.now)
            ) {
              return {
                parameter,
                trigger,
              } as Job;
            } else {
              // Compare scheduled_at
              if (
                typeof waitJob === "undefined" ||
                (waitJob.parameter &&
                  waitJob.parameter.scheduled_at &&
                  parameter.scheduled_at &&
                  waitJob.parameter.scheduled_at > parameter.scheduled_at)
              ) {
                waitJob = {
                  parameter,
                  trigger,
                } as Job;
              } else {
                console.info(
                  `job wait. id: ${
                    parameter.id
                  }, handler: ${trigger.getHandlerFunction()}, created_at: ${
                    parameter.created_at
                  }, parameter: ${parameter.parameter}, scheduled_at: ${
                    parameter.scheduled_at
                  }, now: ${this.now}`
                );
              }
            }
          }
        } else {
          const { state, start_at, id, created_at, end_at } = parameter;

          if (state === "end" || state === "failed") {
            console.info(
              `job clear. id: ${id}, handler: ${trigger.getHandlerFunction()}, status: ${state}, created_at: ${created_at}, start_at: ${start_at}, end_at: ${end_at}`
            );
          } else {
            console.info(
              `job time out. id: ${id}, handler: ${trigger.getHandlerFunction()}, status: ${state}, parameter: ${
                parameter.parameter
              }, created_at: ${created_at}, start_at: ${start_at}`
            );
          }
          ScriptApp.deleteTrigger(trigger);
          this.deleteJob(trigger);
        }
      } else {
        console.info(
          `delete trigger. id: ${trigger.getUniqueId()}, handler: ${trigger.getHandlerFunction()}`
        );
        ScriptApp.deleteTrigger(trigger);
      }
    }

    if (waitJob) {
      return waitJob;
    }

    return null;
  }

  public consumeJob(closure: JobFunction, handler: string | null = null): void {
    const scriptLock = LockService.getScriptLock();

    if (scriptLock.tryLock(500)) {
      const popJob = this.dequeue(
        handler ? handler : this.consumeJob.caller.name
      );

      if (popJob) {
        const { parameter } = popJob;
        parameter.state = "starting";
        parameter.start_at = this.now;
        this.saveJob(popJob);

        scriptLock.releaseLock();

        console.info(
          `job starting. id: ${parameter.id}, created_at: ${parameter.created_at}, start_at: ${parameter.start_at}, parameter: ${parameter.parameter}`
        );

        try {
          closure(JSON.parse(parameter.parameter));

          parameter.state = "end";
          parameter.end_at = this.now;
          this.saveJob(popJob);
          console.info(
            `job success. id: ${parameter.id}, created_at: ${parameter.created_at}, start_at: ${parameter.start_at}, start_at: ${parameter.end_at}, parameter: ${parameter.parameter}`
          );
        } catch (e) {
          parameter.state = "failed";
          parameter.end_at = this.now;
          this.saveJob(popJob);
          console.warn(
            `job failed. message: ${e.message}, stack: ${e.stack}, id: ${parameter.id}, created_at: ${parameter.created_at}, start_at: ${parameter.start_at}, start_at: ${parameter.end_at}, parameter: ${parameter.parameter}`
          );
        }

        return;
      }
      scriptLock.releaseLock();

      console.info(`Nothing active job.`);
    }
  }

  private getCacheKey(trigger: Trigger): string {
    return `${
      this.constructor.name
    }#${trigger.getHandlerFunction()}#${trigger.getUniqueId()}`;
  }

  protected createJob(
    callback: JobFunction,
    parameter: Record<string, any>
  ): Job {
    const trigger = ScriptApp.newTrigger(callback.name)
      .timeBased()
      .after(DELAY_DURATION)
      .create();
    const jobParameter: JobParameter = {
      created_at: this.now,
      handler: callback.name,
      id: trigger.getUniqueId(),
      parameter: JSON.stringify(parameter),
      state: "waiting",
    };

    return {
      trigger,
      parameter: jobParameter,
    };
  }

  private getJobParameter(trigger: Trigger): JobParameter | null {
    const job = this.queue.get(this.getCacheKey(trigger));

    if (job) {
      return JSON.parse(job);
    } else {
      return null;
    }
  }

  private saveJob(job: Job): void {
    const expirationInSeconds = this.getCacheExpirationInSeconds(job.parameter);

    if (expirationInSeconds) {
      this.queue.put(
        this.getCacheKey(job.trigger),
        JSON.stringify(job.parameter),
        expirationInSeconds
      );
    } else {
      this.queue.put(
        this.getCacheKey(job.trigger),
        JSON.stringify(job.parameter)
      );
    }
  }

  private getCacheExpirationInSeconds(
    jobParameter: JobParameter
  ): number | null {
    switch (jobParameter.state) {
      case "waiting":
        if (jobParameter.scheduled_at) {
          return (
            JOB_STARTING_TIME_OUT +
            Math.round((jobParameter.scheduled_at - this.now) / 1000)
          );
        } else {
          // JOB_STARTING_TIME_OUT + DELAY_DURATION(round up milliseconds)
          return JOB_STARTING_TIME_OUT + 1;
        }
      case "starting":
        return JOB_EXECUTE_TIME_OUT;
      case "end":
        // expire
        return 0;
      case "failed":
      default:
        // 6 hour
        return null;
    }
  }

  private isExpire(parameter: JobParameter): boolean {
    switch (parameter.state) {
      case "waiting":
        if (parameter.scheduled_at) {
          return (
            Math.ceil((this.now - parameter.scheduled_at) / 1000) >=
            JOB_STARTING_TIME_OUT
          );
        } else {
          return (
            Math.ceil((this.now - parameter.created_at) / 1000) >=
            JOB_STARTING_TIME_OUT
          );
        }
      case "starting":
        if (parameter.start_at) {
          return (
            Math.ceil((this.now - parameter.start_at) / 1000) >=
            JOB_STARTING_TIME_OUT
          );
        }
        return true;
      case "end":
        return true;
      case "failed":
      default:
        return false;
    }
  }

  private deleteJob(trigger: Trigger): void {
    this.queue.remove(this.getCacheKey(trigger));
  }

  protected get now(): number {
    return new Date().getTime();
  }
}

export { JobBroker, JobFunction, JobParameter, Job };
