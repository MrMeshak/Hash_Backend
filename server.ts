import express, { Request, Response } from "express";
import { graphqlHTTP } from "express-graphql";
import dotenv from "dotenv";
import cors from "cors";
import { authMiddleware } from "./middleware/authMiddleware";
import authRouter from "./restapi/routes/authRoutes";
import gqlSchema from "./graphql/schema";

const app = express();

//middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});

//routes
app.use("/auth", authRouter);

//graphQl
//app.use(authMiddleware);
app.use("/graphql", (req: Request, res: Response) => {
  graphqlHTTP({
    schema: gqlSchema,
    graphiql: true,
    context: {
      userId: "2caaeda4-75c2-42a2-a9a3-eac938f971f1", //res.locals.userId,
      isAuth: true, //res.locals.isAuth,
      error: "", //res.locals.error,
    },
  })(req, res);
});

//Start Server
app.listen(process.env.SERVER_PORT!, () => {
  console.log(`Server is running on port ${process.env.SERVER_PORT}`);
});
