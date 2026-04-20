import { Router } from "express";
import authRouter from "./authRouter.js";
import userRouter from "./userRouter.js";

const router = Router();

router.get("/", (req, res) => {
  return res.json({
    meta: {
      code: 200,
      message: "Success",
    },
  });
});

router.use("/auth", authRouter);
router.use("/me", userRouter);

export default router;
