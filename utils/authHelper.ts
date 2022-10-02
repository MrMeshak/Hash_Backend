import prisma from "./prismaClient";
import validator from "validator";
import bcrypt from "bcrypt";

export const signupUser = async (
  email: string,
  password: string,
  firstname: string,
  lastname: string
) => {
  //Validation
  if (!email || !password || !firstname || !lastname) {
    throw Error("Email, password, firstname and lastname are required");
  }
  if (!validator.isEmail(email)) {
    throw Error("Email is not valid");
  }
  if (!validator.isStrongPassword(password)) {
    throw Error(
      "Password must be at least 8 characters with at least one uppercase, lowercase, number and symbol"
    );
  }
  const exists = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  if (exists) {
    throw Error("Email already in use");
  }

  //hash password
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      email: email,
      password: hash,
      firstname: firstname,
      lastname: lastname,
    },
  });
  return user;
};

export const loginUser = async (email: string, password: string) => {
  //Validation
  if (!email || !password) {
    throw Error("Email and password are required");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  if (!user) {
    throw Error("Email or Password are invalid");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw Error("Email or Password are invalid");
  }
  return user;
};
