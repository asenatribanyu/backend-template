import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  return res.json({
    meta: {
      code: 200,
      message: "Success",
    },
  });
});

export default router;
