import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Student } from '../models/Student';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private http = inject(HttpClient);
  private readonly url = '/api/students';

  findAll(): Observable<Student[]> {
    return this.http.get<Student[]>(this.url);
  }

  findById(id: number): Observable<Student> {
    return this.http.get<Student>(`${this.url}/${id}`);
  }

  create(student: Student): Observable<Student> {
    return this.http.post<Student>(this.url, this.toRequest(student));
  }

  update(id: number, student: Student): Observable<Student> {
    return this.http.put<Student>(`${this.url}/${id}`, this.toRequest(student));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  private toRequest(student: Student): Student {
    const { firstName, lastName, email, dateOfBirth, placeOfBirth } = student;
    return { firstName, lastName, email, dateOfBirth, placeOfBirth };
  }
}
