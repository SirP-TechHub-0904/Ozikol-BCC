import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface WorkExperience {
  company: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  graduationYear: number;
  description: string;
}

export interface CertificationProject {
  title: string;
  issuerOrLink: string;
  year: number;
  description: string;
}

export interface LanguageSkill {
  language: string;
  proficiency: string; // e.g. Native, Fluent, Intermediate
}

export interface UserBiography {
  headline: string;
  professionalSummary: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications: CertificationProject[];
  languages: LanguageSkill[];
}

@Injectable({
  providedIn: 'root'
})
export class BiographyService {
  constructor(private api: ApiService) {}

  public getBiography(): Observable<UserBiography> {
    return this.api.get<UserBiography>('profile/biography');
  }

  public updateBiography(bio: UserBiography): Observable<any> {
    return this.api.put<any>('profile/biography', bio);
  }
}
