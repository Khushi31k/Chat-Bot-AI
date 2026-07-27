import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import journalRouter from "./journal";
import habitsRouter from "./habits";
import goalsRouter from "./goals";
import moodRouter from "./mood";
import calendarRouter from "./calendar";
import meditationRouter from "./meditation";
import openaiRouter from "./openai";
import memoriesRouter from "./memories";
import insightsRouter from "./insights";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(journalRouter);
router.use(habitsRouter);
router.use(goalsRouter);
router.use(moodRouter);
router.use(calendarRouter);
router.use(meditationRouter);
router.use(openaiRouter);
router.use(memoriesRouter);
router.use(insightsRouter);

export default router;
