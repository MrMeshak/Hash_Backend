import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ITokenPayload } from "../utils/jwtHelper";
import prisma from "../utils/prismaClient";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.locals.userId = "";
    res.locals.permissions = "";
    res.locals.isAuth = false;
    res.locals.error = "Missing authentication header";
    return next();
  }

  let decoded;
  try {
    const token = authHeader.split(" ")[1];
    decoded = jwt.verify(token, process.env.SECRET!);
  } catch (error) {
    res.locals.isAuth = false;
    res.locals.userId = "";
    res.locals.permissions = "";
    res.locals.error = (error as Error).message;
    return next();
  }

  if (!decoded) {
    res.locals.isAuth = false;
    res.locals.userId = "";
    res.locals.permissions = "";
    res.locals.error = "Unable to decode JWT";
    return next();
  }

  const user = await prisma.user.findUnique({
    where: {
      id: (decoded as ITokenPayload).id,
    },
    select: {
      permissions: true,
    },
  });

  if (!user) {
    res.locals.isAuth = false;
    res.locals.userId = "";
    res.locals.permissions = "";
    res.locals.error = "User could not be found";
    return next();
  }

  res.locals.isAuth = true;
  res.locals.userId = (decoded as ITokenPayload).id;
  res.locals.permissions = user.permissions;
  res.locals.error = "";

  return next();
};
