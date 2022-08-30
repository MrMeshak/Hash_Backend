import jwt from "jsonwebtoken";

export interface ITokenPayload {
  id: string;
}

//Helper Functions
export const createToken = (id: string) => {
  return jwt.sign({ id: id }, process.env.SECRET!, { expiresIn: "1d" });
};
