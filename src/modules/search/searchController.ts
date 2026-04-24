import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { ApiResponseHandler } from "../../utils/response";
import * as searchService from "./searchService";

// Runs the professional discovery query using the already-validated query-string filters.
export const searchProfessionals = catchAsync(async (req: Request, res: Response) => {
  const result = await searchService.searchProfessionals(req.query as never);

  return ApiResponseHandler.success(
    res,
    {
      professionals: result.professionals,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      },
    },
    "Search results fetched successfully"
  );
});

// Returns lookup data needed to build the search UI filters client-side.
export const getFilters = catchAsync(async (_req: Request, res: Response) => {
  const filters = await searchService.getFilterOptions();

  return ApiResponseHandler.success(res, { filters }, "Search filters fetched successfully");
});

// Returns a short skill list for typeahead/autocomplete widgets.
export const autocompleteSkills = catchAsync(async (req: Request, res: Response) => {
  const queryParams = req.query as unknown as { q: string; limit: number };
  const skills = await searchService.autocompleteSkills(queryParams.q, queryParams.limit);

  return ApiResponseHandler.success(res, { skills }, "Skills fetched successfully");
});
