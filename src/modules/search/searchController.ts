import crypto from "crypto";
import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import logger from "../../utils/logger";
import { ApiResponseHandler } from "../../utils/response";
import * as searchService from "./searchService";
import { parseQuery } from "./searchParserService";
import { SearchFilters } from "../../types/searchTypes";

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

export const searchProfessionalsNlp = catchAsync(async (req: Request, res: Response) => {
  const body = req.body as { query: string; location?: string; rating?: string; budget?: string; page: number; limit: number };
  const requestId = req.header("x-request-id") || crypto.randomUUID();
  const startedAt = Date.now();
  res.setHeader("X-Search-Request-Id", requestId);
  logger.info("Search NLP request received", {
    requestId,
    route: req.originalUrl,
    method: req.method,
    query: body.query,
    location: body.location,
    rating: body.rating,
    budget: body.budget,
    page: body.page,
    limit: body.limit,
    ip: req.ip,
  });

  const parsedQuery = await parseQuery({ ...body, requestId });
  logger.info("Search NLP parser result ready", {
    requestId,
    parserSource: parsedQuery.parserSource,
    profession: parsedQuery.primaryProfession,
    skill: parsedQuery.primarySkill,
    confidence: parsedQuery.confidence,
    keywords: parsedQuery.keywords,
    filters: parsedQuery.filters,
  });

  const searchParams: SearchFilters = {
    page: body.page,
    limit: body.limit,
    sortBy: "rating_desc",
    inferredProfession: parsedQuery.primaryProfession ?? undefined,
    inferredSkill: parsedQuery.primarySkill ?? undefined,
    inferredKeywords: parsedQuery.keywords,
    location: parsedQuery.filters.location,
    minRating: parsedQuery.filters.ratingMin,
    minRate: parsedQuery.filters.budgetMin,
    maxRate: parsedQuery.filters.budgetMax,
    budgetMin: parsedQuery.filters.budgetMin,
    budgetMax: parsedQuery.filters.budgetMax,
  };
  logger.info("Search NLP repository search starting", {
    requestId,
    searchParams,
  });
  const result = await searchService.searchProfessionals(searchParams);
  logger.info("Search NLP repository search completed", {
    requestId,
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages,
    returned: result.professionals.length,
    durationMs: Date.now() - startedAt,
  });
  res.setHeader("X-Parser-Source", parsedQuery.parserSource);
  const response = ApiResponseHandler.success(res, {
    professionals: result.professionals,
    meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.pages },
    parsedQuery,
  }, "Search results fetched successfully");
  logger.info("Search NLP response sent", {
    requestId,
    parserSource: parsedQuery.parserSource,
    profession: parsedQuery.primaryProfession,
    statusCode: res.statusCode,
    durationMs: Date.now() - startedAt,
  });
  return response;
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
