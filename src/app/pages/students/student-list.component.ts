import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Student } from '../../core/models/Student';
import { StudentService } from '../../core/service/student.service';
import { apiErrorMessage } from '../../shared/api-error';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './student-list.component.html'
})
export class StudentListComponent implements OnInit {
  private service = inject(StudentService);
  private destroyRef = inject(DestroyRef);
  readonly deleted = inject(ActivatedRoute).snapshot.queryParamMap.get('deleted') === '1';
  students: Student[] = [];
  loading = false;
  errorMessage = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    if (this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    this.service.findAll().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading = false))
      .subscribe({
        next: students => this.students = students,
        error: error => this.errorMessage = apiErrorMessage(error)
      });
  }
}
