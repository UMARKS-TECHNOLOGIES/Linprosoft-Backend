import express from 'express';
import * as controller from './assignmentController';
import { protect } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validationMiddleware';
import { createJobAssignmentSchema, listAssignmentsSchema,  getAssignmentByIdSchema, updateAssignmentSchema, deleteAssignmentSchema, approveSatisfactionSchema, disputeSatisfactionSchema } from './assignmentsValidation';

const router = express.Router();
//Create an assignment
router.post('/', protect, validate(createJobAssignmentSchema), controller.createAssignment); 
//Get all assignments
router.get('/', protect, validate(listAssignmentsSchema), controller.listAssignments); 
//Get an assignment by ID
router.get('/:id', protect, validate(getAssignmentByIdSchema), controller.getAssignmentById); 
//Update an assignment
router.put('/:id', protect, validate(updateAssignmentSchema), controller.updateAssignment); 
//Delete an assignment
router.delete('/:id', protect, validate(deleteAssignmentSchema), controller.deleteAssignment); 

// Employer approves satisfaction (employer-only, must own assignment)
router.patch('/:id/approve-satisfaction', protect, validate(approveSatisfactionSchema), controller.approveSatisfaction);

// Employer disputes satisfaction
router.patch('/:id/dispute-satisfaction', protect, validate(disputeSatisfactionSchema), controller.disputeSatisfaction);

export default router;