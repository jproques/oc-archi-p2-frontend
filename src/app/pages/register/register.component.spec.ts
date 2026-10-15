import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterComponent } from './register.component';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let http: HttpTestingController;
  let navigate: jest.SpyInstance;
  const user = {
    firstName: 'Alice', lastName: 'Martin', login: 'alice.martin', password: 'test-password'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ]
    })
    .compileComponents();

    http = TestBed.inject(HttpTestingController);
    navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function submit() {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.each([
    ['firstName', 'First Name is required'],
    ['lastName', 'Last Name is required'],
    ['login', 'Login is required'],
    ['password', 'password is required']
  ])('requires %s before calling the API', (field, message) => {
    component.registerForm.setValue({ ...user, [field]: '' });
    submit();

    expect(component.registerForm.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(message);
    http.expectNone('/api/register');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends the exact registration DTO and redirects only after success', () => {
    component.registerForm.setValue(user);
    submit();

    const request = http.expectOne('/api/register');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(user);
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[formControlName="password"]').type).toBe('password');

    request.flush(null, { status: 201, statusText: 'Created' });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('clears the fields and validation messages when cancelling', () => {
    component.registerForm.setValue({ ...user, firstName: '' });
    component.registerForm.markAllAsTouched();
    component.registerForm.markAsDirty();
    submit();
    expect(fixture.nativeElement.textContent).toContain('First Name is required');

    fixture.nativeElement.querySelector('button[type="reset"]').click();
    fixture.detectChanges();

    expect(component.submitted).toBe(false);
    expect(component.registerForm.getRawValue()).toEqual({
      firstName: null, lastName: null, login: null, password: null
    });
    expect(component.registerForm.pristine).toBe(true);
    expect(component.registerForm.untouched).toBe(true);
    expect(fixture.nativeElement.querySelector('.invalid-feedback')).toBeNull();
    http.expectNone('/api/register');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('cancels the pending request when the component is destroyed', () => {
    component.registerForm.setValue(user);
    submit();
    const request = http.expectOne('/api/register');

    fixture.destroy();

    expect(request.cancelled).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
