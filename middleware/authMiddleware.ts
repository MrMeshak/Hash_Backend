import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ITokenPayload } from "../utils/jwtHelper";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.locals.error = "Missing authentication header";
    res.locals.isAuth = false;
    return next();
  }

  let decoded;
  try {
    const token = authHeader.split(" ")[1];
    decoded = jwt.verify(token, process.env.SECRET!);
  } catch (error) {
    res.locals.isAuth = false;
    res.locals.error = (error as Error).message;
    return next();
  }

  if (!decoded) {
    res.locals.isAuth = false;
    res.locals.error = "Unable to decode JWT";
    return next();
  }

  res.locals.isAuth = true;
  res.locals.userId = (decoded as ITokenPayload).id;
  res.locals.error = "";
  return next();
};
