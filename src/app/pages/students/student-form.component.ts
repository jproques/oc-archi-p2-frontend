import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, switchMap, tap } from 'rxjs';
import { StudentService } from '../../core/service/student.service';
import { apiErrorMessage } from '../../shared/api-error';
import { birthDateValidator, studentId, today } from '../../shared/student-validation';

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './student-form.component.html'
})
export class StudentFormComponent implements OnInit {
  private service = inject(StudentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private id: number | null = null;
  readonly maxDate = today();
  readonly fields = [
    { name: 'firstName', label: 'Prénom', type: 'text' },
    { name: 'lastName', label: 'Nom', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'dateOfBirth', label: 'Date de naissance', type: 'date' },
    { name: 'placeOfBirth', label: 'Lieu de naissance', type: 'text' }
  ] as const;
  private requiredText = [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)];
  readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', this.requiredText],
    lastName: ['', this.requiredText],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    dateOfBirth: ['', [Validators.required, birthDateValidator]],
    placeOfBirth: ['', this.requiredText]
  });
  editing = false;
  loading = false;
  saving = false;
  submitted = false;
  errorMessage = '';
  ready = false;

  ngOnInit(): void {
    this.route.paramMap.pipe(switchMap(params => {
      this.editing = params.has('id');
      this.id = studentId(params.get('id'));
      this.errorMessage = '';
      this.submitted = false;
      this.ready = !this.editing;
      this.form.reset();
      if (!this.editing) { this.form.enable(); return EMPTY; }
      this.form.disable();
      if (this.id === null) { this.errorMessage = 'Identifiant étudiant invalide.'; return EMPTY; }
      this.loading = true;
      return this.service.findById(this.id).pipe(
        tap(student => { this.form.patchValue(student); this.ready = true; }),
        catchError(error => { this.errorMessage = apiErrorMessage(error); return EMPTY; }),
        finalize(() => { this.loading = false; if (this.ready) this.form.enable(); })
      );
    }), takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  onSubmit(): void {
    if (!this.ready || this.loading || this.saving) return;
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const data = this.form.getRawValue();
    const student = { ...data, firstName: data.firstName.trim(), lastName: data.lastName.trim(),
      email: data.email.trim(), placeOfBirth: data.placeOfBirth.trim() };
    const request = this.editing && this.id !== null
      ? this.service.update(this.id, student) : this.service.create(student);
    this.saving = true;
    this.form.disable();
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.saving = false; this.form.enable(); }))
      .subscribe({
        next: saved => void this.router.navigate(['/students', saved.id], {
          queryParams: { saved: this.editing ? 'updated' : 'created' }
        }),
        error: error => this.errorMessage = apiErrorMessage(error)
      });
  }
}
