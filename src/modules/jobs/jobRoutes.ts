import express from 'express';
import * as controller from './jobController';
import { protect } from '../../middleware/authMiddleware';
const router = express.Router();

router.post('/', protect, controller.createJob); //Create a job posting
router.get('/', protect, controller.listJobs); //List jobs 
router.get('/:id', protect, controller.getJob); //Get job details
router.put('/:id', protect, controller.updateJob);//Update job posting(employer only)
router.delete('/:id', protect, controller.deleteJob);//Soft-delete job posting(employer only)

export default router;