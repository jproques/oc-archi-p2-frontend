import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, switchMap } from 'rxjs';
import { Student } from '../../core/models/Student';
import { StudentService } from '../../core/service/student.service';
import { apiErrorMessage } from '../../shared/api-error';
import { studentId } from '../../shared/student-validation';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './student-detail.component.html'
})
export class StudentDetailComponent implements OnInit {
  private service = inject(StudentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  student: Student | null = null;
  loading = false;
  deleting = false;
  confirmDelete = false;
  errorMessage = '';
  get savedMessage(): string {
    const saved = this.route.snapshot.queryParamMap.get('saved');
    return saved === 'created' ? 'Étudiant créé.' : saved === 'updated' ? 'Étudiant modifié.' : '';
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(switchMap(params => {
      this.student = null;
      this.errorMessage = '';
      this.confirmDelete = this.route.snapshot.queryParamMap.get('delete') === '1';
      const id = studentId(params.get('id'));
      if (id === null) {
        this.errorMessage = 'Identifiant étudiant invalide.';
        return EMPTY;
      }
      this.loading = true;
      return this.service.findById(id).pipe(
        catchError(error => { this.errorMessage = apiErrorMessage(error); return EMPTY; }),
        finalize(() => this.loading = false)
      );
    }), takeUntilDestroyed(this.destroyRef)).subscribe(student => this.student = student);
  }

  delete(): void {
    if (!this.confirmDelete || !this.student?.id || this.deleting) return;
    this.deleting = true;
    this.errorMessage = '';
    this.service.delete(this.student.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deleting = false))
      .subscribe({
        next: () => void this.router.navigate(['/students'], { queryParams: { deleted: '1' } }),
        error: error => this.errorMessage = apiErrorMessage(error)
      });
  }
}
