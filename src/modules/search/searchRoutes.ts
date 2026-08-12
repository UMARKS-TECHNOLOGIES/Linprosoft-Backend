import { Router } from "express";
import { validate } from "../../middleware/validationMiddleware";
import * as searchController from "./searchController";
import { nlpSearchBodySchema, searchQuerySchema, skillAutocompleteQuerySchema } from "./searchValidaition";

const router = Router();

// Search is read-only, so no auth middleware is needed on these endpoints.
router.get("/professionals", validate(searchQuerySchema, { source: "query" }), searchController.searchProfessionals);
router.post("/professionals", validate(nlpSearchBodySchema, { source: "body" }), searchController.searchProfessionalsNlp);
router.get("/filters", searchController.getFilters);
router.get("/skills", validate(skillAutocompleteQuerySchema, { source: "query" }), searchController.autocompleteSkills);

export default router;
