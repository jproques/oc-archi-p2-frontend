import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { UserService } from '../../core/service/user.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function submit() {
    component.loginForm.setValue({ login: 'test-user', password: 'test-password' });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    return http.expectOne('/api/login');
  }

  it('requires both fields before calling the API', () => {
    component.onSubmit();
    fixture.detectChanges();
    http.expectNone('/api/login');
    expect(fixture.nativeElement.textContent).toContain('L’identifiant est obligatoire.');
    expect(fixture.nativeElement.textContent).toContain('Le mot de passe est obligatoire.');
    expect(fixture.nativeElement.querySelector('#password').type).toBe('password');
  });

  it('sends the DTO and prevents duplicate submissions during loading', () => {
    const request = submit();
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ login: 'test-user', password: 'test-password' });
    expect(request.request.responseType).toBe('text');
    expect(component.loading).toBe(true);
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    expect(component.loginForm.disabled).toBe(true);
    component.onSubmit();
    http.expectNone('/api/login');

    request.flush('signed-jwt-token');
    fixture.detectChanges();
    expect(TestBed.inject(UserService).token()).toBe('signed-jwt-token');
    expect(component.loading).toBe(false);
    expect(component.loginForm.enabled).toBe(true);
    expect(component.loginForm.controls.password.value).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Connexion réussie');
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/students');
  });

  it('displays JSON server errors and allows retrying', () => {
    submit().flush(JSON.stringify({ message: 'Invalid credentials' }), {
      status: 400, statusText: 'Bad Request'
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Invalid credentials');
    expect(component.loading).toBe(false);
    expect(component.success).toBe(false);
    expect(TestBed.inject(UserService).token()).toBeNull();

    submit().flush('new-token');
    fixture.detectChanges();
    expect(component.success).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('displays plain text server errors', () => {
    submit().flush('Internal Server error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Internal Server error');
    expect(component.loading).toBe(false);
  });

  it('displays a connection error when the server cannot be reached', () => {
    submit().error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Impossible de joindre le serveur');
    expect(component.loading).toBe(false);
  });

  it('does not show success if the server returns an empty token', () => {
    submit().flush('');
    fixture.detectChanges();
    expect(component.success).toBe(false);
    expect(component.loading).toBe(false);
    expect(TestBed.inject(UserService).token()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('n’a pas renvoyé de token');
  });
});
