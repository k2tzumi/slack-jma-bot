import { NetworkAccessError } from "./NetworkAccessError";

type URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;

/**
 * エリア
 * @see https://www.jma.go.jp/bosai/common/const/area.json
 */
interface Area {
  centers: {
    [areacode: string]: {
      name: string;
      enNmae: string;
      officeName: string;
      children: string[];
    };
  };
  offices: {
    [areacode: string]: {
      name: string;
      enNmae: string;
      officeName: string;
      parent: string;
      children: string[];
    };
  };
  class10s: {
    [areacode: string]: {
      name: string;
      enNmae: string;
      parent: string;
      children: string[];
    };
  };
  class15s: {
    [areacode: string]: {
      name: string;
      enNmae: string;
      parent: string;
      children: string[];
    };
  };
  class20s: {
    [areac20e: string]: {
      name: string;
      enNmae: string;
      kana: string;
      parent: string;
    };
  };
}

/**
 * 天気概況（明後日まで）
 * @see https://www.jma.go.jp/bosai/forecast/data/overview_forecast/130000.json
 */
interface OverviewForecast {
  publishingOffice: string;
  reportDatetime: Date;
  targetArea: string;
  headlineText: string;
  text: string;
}

const BASE_URI = "http://www.jma.go.jp/";
class JmaClient {
  public getArea(): Area {
    const endPoint = BASE_URI + "bosai/common/const/area.json";

    const response = this.request(endPoint) as Area;

    return response;
  }

  public getOverviewForecast(pathCode: string): OverviewForecast {
    const endPoint =
      BASE_URI + `bosai/forecast/data/overview_forecast/${pathCode}.json`;
    const response = this.request(endPoint) as OverviewForecast;

    return response;
  }

  private postRequestHeader() {
    return {
      "content-type": "application/json; charset=UTF-8",
    };
  }

  private getRequestHeader() {
    return {
      "content-type": "application/x-www-form-urlencoded",
    };
  }

  private postRequestOptions(
    payload: Record<string, any>
  ): URLFetchRequestOptions {
    const options: URLFetchRequestOptions = {
      method: "post",
      headers: this.postRequestHeader(),
      muteHttpExceptions: true,
      payload: payload instanceof String ? payload : JSON.stringify(payload),
    };

    return options;
  }

  private getRequestOptions(): URLFetchRequestOptions {
    const options: URLFetchRequestOptions = {
      method: "get",
      headers: this.getRequestHeader(),
      muteHttpExceptions: true,
    };

    return options;
  }

  /**
   * @param endPoint
   * @param options
   * @throws NetworkAccessError
   */
  private request(
    endPoint: string,
    payload: Record<string, any> = {}
  ): Record<string, any> {
    let response;

    try {
      switch (this.preferredHttpMethod(endPoint)) {
        case "post":
          response = UrlFetchApp.fetch(
            endPoint,
            this.postRequestOptions(payload)
          );
          break;
        case "get":
          response = UrlFetchApp.fetch(
            this.formUrlEncoded(endPoint, payload),
            this.getRequestOptions()
          );
          break;
        default:
          throw new Error("Unknow endPoint");
      }
    } catch (e) {
      console.warn(`DNS error, etc. ${e.message}`);
      throw new NetworkAccessError(500, e.message);
    }

    switch (response.getResponseCode()) {
      case 200:
      case 404:
        return JSON.parse(response.getContentText());
      default:
        console.warn(
          `Strava API error. endpoint: ${endPoint}, status: ${response.getResponseCode()}, content: ${response.getContentText()}`
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          response.getContentText()
        );
    }
  }

  private preferredHttpMethod(endPoint: string): string {
    return "get";
  }

  private formUrlEncoded(
    endPoint: string,
    payload: Record<string, any>
  ): string {
    const query = Object.entries<string>(payload)
      .map(([key, value]) => `${key}=${encodeURI(value)}`)
      .join("&");

    return `${endPoint}?${query}`;
  }
}

export { JmaClient, Area };
