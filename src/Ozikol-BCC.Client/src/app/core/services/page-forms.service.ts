import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface PageFormFieldItem {
  id?: string;
  fieldKey: string;
  label: string;
  placeholder?: string;
  fieldType: 'text' | 'email' | 'phone' | 'textarea' | 'dropdown' | 'pill_select' | 'checkbox' | 'number';
  optionsJson?: string;
  isRequired: boolean;
  sortOrder: number;
  gridWidth?: string;
  helpText?: string;
}

export interface PageFormItem {
  id: string;
  title: string;
  formKey: string;
  description?: string;
  submitButtonText?: string;
  successMessage?: string;
  notificationEmail?: string;
  isActive: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string;
  fieldCount?: number;
  totalSubmissions?: number;
  newSubmissions?: number;
  fields?: PageFormFieldItem[];
}

export interface PageFormSubmissionItem {
  id: string;
  pageFormId: string;
  submittedAtUtc: string;
  dataJson: string;
  sourcePageUrl?: string;
  status: string; // 'New' | 'Contacted' | 'Closed'
  adminNotes?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SubmissionsResponse {
  form: PageFormItem;
  totalCount: number;
  page: number;
  pageSize: number;
  items: PageFormSubmissionItem[];
}

/**
 * Service for administrative and public operations on CMS Page Forms and visitor submissions.
 */
@Injectable({
  providedIn: 'root'
})
export class PageFormsService {
  constructor(private api: ApiService) {}

  /**
   * Retrieves all administrative forms.
   */
  getAllForms(): Observable<any> {
    return this.api.get<any>('PageFormsApi');
  }

  /**
   * Retrieves a single form by its unique ID.
   */
  getFormById(id: string): Observable<any> {
    return this.api.get<any>(`PageFormsApi/${id}`);
  }

  /**
   * Retrieves a single form by its unique programmatic key.
   */
  getFormByKey(formKey: string): Observable<any> {
    return this.api.get<any>(`PageFormsApi/by-key/${formKey}`);
  }

  /**
   * Creates a new PageForm.
   */
  createForm(payload: Partial<PageFormItem>): Observable<any> {
    return this.api.post<any>('PageFormsApi', payload);
  }

  /**
   * Updates an existing PageForm.
   */
  updateForm(id: string, payload: Partial<PageFormItem>): Observable<any> {
    return this.api.put<any>(`PageFormsApi/${id}`, payload);
  }

  /**
   * Deletes a form and all its fields and submissions.
   */
  deleteForm(id: string): Observable<any> {
    return this.api.delete<any>(`PageFormsApi/${id}`);
  }

  /**
   * Retrieves paginated submissions for a specific form.
   */
  getFormSubmissions(id: string, params?: { status?: string; search?: string; page?: number; pageSize?: number }): Observable<any> {
    return this.api.get<any>(`PageFormsApi/${id}/submissions`, params);
  }

  /**
   * Updates submission status or admin follow-up notes.
   */
  updateSubmissionStatus(submissionId: string, status?: string, adminNotes?: string): Observable<any> {
    return this.api.put<any>(`PageFormsApi/submissions/${submissionId}/status`, { status, adminNotes });
  }

  /**
   * Deletes a single submission entry.
   */
  deleteSubmission(submissionId: string): Observable<any> {
    return this.api.delete<any>(`PageFormsApi/submissions/${submissionId}`);
  }

  /**
   * Public endpoint to fetch active form schema for public website rendering.
   */
  getPublicForm(formKey: string): Observable<any> {
    return this.api.get<any>(`WebsiteContentApi/forms/${formKey}`);
  }

  /**
   * Public endpoint to submit visitor data to a form.
   */
  submitPublicForm(formKey: string, data: Record<string, any>, sourcePageUrl?: string): Observable<any> {
    return this.api.post<any>(`WebsiteContentApi/forms/${formKey}/submit`, { data, sourcePageUrl });
  }
}
