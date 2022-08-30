import express from "express";
import * as authController from "../controllers/authController";

const router = express.Router();

//Login Route
router.post("/login", authController.login);

//Signup Route
router.post("/signup", authController.signup);

export default router;
