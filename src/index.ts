import { doPost } from "./Code";

declare const global: {
  [x: string]: unknown;
};

global.doPost = doPost;
