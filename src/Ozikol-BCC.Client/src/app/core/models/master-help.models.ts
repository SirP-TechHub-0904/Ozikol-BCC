export interface HelpActionItemDto {
  trigger: string;
  icon?: string;
  description: string;
  route?: string;
}

export interface HelpRelatedRouteDto {
  title: string;
  route: string;
  icon?: string;
}

export interface MasterPageHelpDto {
  id: string;
  routeKey: string;
  featureSuite: string;
  pageTitle: string;
  shortSummary?: string;
  overviewMarkdown: string;
  actionsJson?: string;
  actions?: HelpActionItemDto[];
  relatedRoutesJson?: string;
  relatedRoutes?: HelpRelatedRouteDto[];
  tourStepsJson?: string;
  category: string;
  isPublished: boolean;
  lastUpdatedBy?: string;
  updatedAtUtc: string;
}

export interface SaveMasterPageHelpRequest {
  routeKey: string;
  featureSuite: string;
  pageTitle: string;
  shortSummary?: string;
  overviewMarkdown: string;
  actionsJson?: string;
  relatedRoutesJson?: string;
  tourStepsJson?: string;
  category: string;
  isPublished: boolean;
}

export interface MasterHelpTopicSearchResultDto {
  routeKey: string;
  pageTitle: string;
  featureSuite: string;
  shortSummary?: string;
  category: string;
}
