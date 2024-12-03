// src/types/express/index.d.ts
import * as express from "express";

declare global {
  namespace Express {
    interface Request {
      user?: any; // ユーザーオブジェクトの型を適宜変更してください
    }
  }
}
