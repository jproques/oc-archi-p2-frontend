import { Component, DestroyRef, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { UserService } from '../../core/service/user.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly loginForm = inject(FormBuilder).nonNullable.group({
    login: ['', [Validators.required, Validators.pattern(/\S/)]],
    password: ['', Validators.required]
  });
  submitted = false;
  loading = false;
  errorMessage = '';
  success = false;

  onSubmit(): void {
    if (this.loading) return;
    this.submitted = true;
    this.errorMessage = '';
    this.success = false;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.loginForm.disable();
    this.userService.login(this.loginForm.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
          this.loginForm.enable();
        })
      )
      .subscribe({
        next: () => {
          this.success = true;
          this.loginForm.controls.password.reset();
          this.submitted = false;
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          void this.router.navigateByUrl(returnUrl && /^\/students(?:\/|\?|$)/.test(returnUrl)
            ? returnUrl : '/students');
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(error);
        }
      });
  }

  private getErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return error instanceof Error ? error.message : 'La connexion a échoué.';
    }
    if (error.status === 0) {
      return 'Impossible de joindre le serveur. Réessayez dans quelques instants.';
    }
    // responseType: 'text' means JSON error bodies also arrive as strings.
    let body = error.error;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        if (body.trim() && !body.trim().startsWith('<')) return body;
      }
    }
    if (body && typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
    return error.status === 401
      ? 'Identifiant ou mot de passe incorrect.'
      : `La connexion a échoué (erreur ${error.status}). Réessayez.`;
  }
}
