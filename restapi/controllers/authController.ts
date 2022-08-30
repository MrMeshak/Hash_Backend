import { Request, Response } from "express";
import prisma from "../../utils/prismaClient";
import { loginUser, signupUser } from "../../utils/authHelper";
import { createToken } from "../../utils/jwtHelper";
import { removeSensitiveUserData } from "../../utils/graphQlHelper";

//Signup User
/*
{
    email: string;
    password: string;
    firstname: string;
    lastname: string;
}
*/
export const signup = async (req: Request, res: Response) => {
  const { email, password, firstname, lastname } = req.body;
  try {
    const user = await signupUser(email, password, firstname, lastname);
    const token = createToken(user.id);
    res.status(200).json({
      authToken: token,
      user: removeSensitiveUserData(user),
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

//Login User
/*
{
    email: string;
    password: string;
}
*/

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await loginUser(email, password);
    const token = createToken(user.id);
    res.status(200).json({
      authToken: token,
      user: removeSensitiveUserData(user),
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
