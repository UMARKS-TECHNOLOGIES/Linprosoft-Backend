import express from 'express';
import * as controller from './jobController';
import { protect } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validationMiddleware';
import { createJobSchema, jobIdParamSchema, listJobsQuerySchema, updateJobSchema } from './jobValidation';
const router = express.Router();

router.post('/', protect, validate(createJobSchema), controller.createJob); //Create a job posting
router.get('/me', protect, validate(listJobsQuerySchema, {source: "query"}), controller.listMyJobs); //List jobs created by the logged-in employer
router.get('/', protect,validate(listJobsQuerySchema, {source: "query"}),  controller.listJobs); //List jobs 
router.get('/:id', protect, validate(jobIdParamSchema, { source: "params" }), controller.getJob); //Get job details
router.put('/:id', protect, validate(jobIdParamSchema, { source: "params" }), validate(updateJobSchema), controller.updateJob);//Update job posting(employer only)
router.delete('/:id', protect, validate(jobIdParamSchema, { source: "params" }), controller.deleteJob);//Soft-delete job posting(employer only)

router.get('/:id/matches', protect, validate(jobIdParamSchema, { source: "params" }), controller.matchJobToProfessionalSkill); //Match jobs to professional skills

export default router;
