import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { authInterceptor } from '../../core/interceptors/auth.interceptor';
import { UserService } from '../../core/service/user.service';
import { StudentService } from '../../core/service/student.service';
import { Student } from '../../core/models/Student';
import { StudentListComponent } from './student-list.component';
import { StudentFormComponent } from './student-form.component';
import { StudentDetailComponent } from './student-detail.component';

const student: Student = {
  id: 42, firstName: 'Alice', lastName: 'Martin', email: 'alice@example.com',
  dateOfBirth: '2000-04-12', placeOfBirth: 'Paris'
};
const { id: _id, ...body } = student;

describe('Student screens, guard and API', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let userService: UserService;
  let token: string;

  function authenticate(exp = Math.floor(Date.now() / 1000) + 3600) {
    token = `e30.${btoa(JSON.stringify({ exp }))}.signature`;
    userService.login({ login: 'test-agent', password: 'test-password' }).subscribe();
    http.expectOne('/api/login').flush(token);
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    userService = TestBed.inject(UserService);
    authenticate();
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const text = () => harness.routeNativeElement?.textContent ?? '';
  const form = () => harness.fixture.debugElement.query(By.directive(StudentFormComponent))
    .componentInstance as StudentFormComponent;
  const detail = () => harness.fixture.debugElement.query(By.directive(StudentDetailComponent))
    .componentInstance as StudentDetailComponent;

  it.each(['/students', '/students/new', '/students/42', '/students/42/edit'])(
    'redirects unauthenticated users from %s to login', async url => {
      userService.logout();
      await harness.navigateByUrl(url);
      expect(TestBed.inject(Router).url).toContain('/login?returnUrl=');
      expect(text()).toContain('Connexion');
      http.expectNone(request => request.url.startsWith('/api/students'));
    });

  it('rejects expired tokens', async () => {
    authenticate(Math.floor(Date.now() / 1000) - 1);
    await harness.navigateByUrl('/students');
    expect(TestBed.inject(Router).url).toContain('/login');
    expect(userService.token()).toBeNull();
    http.expectNone('/api/students');
  });

  it('checks the guard again when navigating between student pages', async () => {
    await harness.navigateByUrl('/students');
    http.expectOne('/api/students').flush([]);
    userService.logout();
    await harness.navigateByUrl('/students/new');
    expect(TestBed.inject(Router).url).toContain('/login');
  });

  it('displays the list, actions and sends the Bearer token', async () => {
    await harness.navigateByUrl('/students');
    expect(text()).toContain('Chargement des étudiants');
    const request = http.expectOne('/api/students');
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    request.flush([student]);
    harness.detectChanges();
    expect(text()).toContain('Alice');
    expect(text()).toContain('alice@example.com');
    expect(harness.routeNativeElement?.querySelector('a[href="/students/42/edit"]')).toBeTruthy();
  });

  it('displays an empty list', async () => {
    await harness.navigateByUrl('/students');
    http.expectOne('/api/students').flush([]);
    harness.detectChanges();
    expect(text()).toContain('Aucun étudiant enregistré');
  });

  it('displays server errors and retries loading the list', async () => {
    await harness.navigateByUrl('/students');
    http.expectOne('/api/students').flush({ message: 'Service indisponible' }, {
      status: 500, statusText: 'Server Error'
    });
    harness.detectChanges();
    expect(text()).toContain('Service indisponible');
    const list = harness.fixture.debugElement.query(By.directive(StudentListComponent))
      .componentInstance as StudentListComponent;
    list.load();
    http.expectOne('/api/students').flush([student]);
    harness.detectChanges();
    expect(text()).toContain('Alice');
    expect(text()).not.toContain('Service indisponible');
  });

  it('displays all student details', async () => {
    await harness.navigateByUrl('/students/42');
    http.expectOne('/api/students/42').flush(student);
    harness.detectChanges();
    for (const value of ['Alice', 'Martin', 'alice@example.com', '12/04/2000', 'Paris']) {
      expect(text()).toContain(value);
    }
  });

  it('displays a 404 error for a missing student', async () => {
    await harness.navigateByUrl('/students/42');
    http.expectOne('/api/students/42').flush({ message: 'Étudiant introuvable' }, {
      status: 404, statusText: 'Not Found'
    });
    harness.detectChanges();
    expect(text()).toContain('Étudiant introuvable');
    expect(detail().loading).toBe(false);
  });

  it('validates required fields, email, whitespace and future birth dates before sending', async () => {
    await harness.navigateByUrl('/students/new');
    form().onSubmit();
    harness.detectChanges();
    expect(text()).toContain('Prénom est obligatoire');
    form().form.setValue({ ...body, firstName: ' ', email: 'invalid', dateOfBirth: '2999-01-01' });
    form().onSubmit();
    harness.detectChanges();
    expect(text()).toContain('Saisissez un email valide');
    expect(text()).toContain('qui ne soit pas future');
    expect(form().form.invalid).toBe(true);
    http.expectNone('/api/students');
  });

  it('creates with the exact DTO, prevents duplicates and opens the saved detail', async () => {
    await harness.navigateByUrl('/students/new');
    form().form.setValue(body);
    form().onSubmit();
    expect(form().saving).toBe(true);
    expect(form().form.disabled).toBe(true);
    form().onSubmit();
    const request = http.expectOne('/api/students');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(student);
    await harness.fixture.whenStable();
    harness.detectChanges();
    http.expectOne('/api/students/42').flush(student);
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/students/42?saved=created');
    expect(text()).toContain('Étudiant créé');
  });

  it('prefills and updates all fields without sending the id', async () => {
    await harness.navigateByUrl('/students/42/edit');
    http.expectOne('/api/students/42').flush(student);
    expect(form().form.getRawValue()).toEqual(body);
    const updated = { ...body, firstName: 'Emma', lastName: 'Durand', email: 'emma@example.com',
      dateOfBirth: '2001-05-16', placeOfBirth: 'Lyon' };
    form().form.setValue(updated);
    form().onSubmit();
    const request = http.expectOne('/api/students/42');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(updated);
    request.flush({ ...updated, id: 42 });
    await harness.fixture.whenStable();
    harness.detectChanges();
    http.expectOne('/api/students/42').flush({ ...updated, id: 42 });
    harness.detectChanges();
    expect(text()).toContain('Étudiant modifié');
    expect(text()).toContain('Emma');
  });

  it('keeps entered fields and re-enables the form after a save error', async () => {
    await harness.navigateByUrl('/students/new');
    form().form.setValue(body);
    form().onSubmit();
    http.expectOne('/api/students').flush({ message: 'Données refusées' }, {
      status: 400, statusText: 'Bad Request'
    });
    harness.detectChanges();
    expect(text()).toContain('Données refusées');
    expect(form().form.getRawValue()).toEqual(body);
    expect(form().saving).toBe(false);
    expect(form().form.enabled).toBe(true);
  });

  it('does not allow editing a student that could not be loaded', async () => {
    await harness.navigateByUrl('/students/42/edit');
    http.expectOne('/api/students/42').flush(null, { status: 404, statusText: 'Not Found' });
    form().onSubmit();
    expect(form().ready).toBe(false);
    expect(form().form.disabled).toBe(true);
    http.expectNone('/api/students/42');
  });

  it('requires confirmation, allows cancellation, and deletes only once', async () => {
    await harness.navigateByUrl('/students/42');
    http.expectOne('/api/students/42').flush(student);
    detail().delete();
    http.expectNone('/api/students/42');
    detail().confirmDelete = true;
    harness.detectChanges();
    expect(text()).toContain('Supprimer définitivement Alice Martin');
    const cancel = Array.from(harness.routeNativeElement!.querySelectorAll('button'))
      .find(button => button.textContent === 'Annuler')!;
    cancel.click();
    expect(detail().confirmDelete).toBe(false);
    detail().confirmDelete = true;
    detail().delete();
    detail().delete();
    const request = http.expectOne('/api/students/42');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    await harness.fixture.whenStable();
    harness.detectChanges();
    http.expectOne('/api/students').flush([]);
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/students?deleted=1');
    expect(text()).toContain('Étudiant supprimé');
  });

  it('retains the student and allows retrying after a deletion error', async () => {
    await harness.navigateByUrl('/students/42?delete=1');
    http.expectOne('/api/students/42').flush(student);
    detail().delete();
    http.expectOne('/api/students/42').flush({ message: 'Suppression impossible' }, {
      status: 500, statusText: 'Server Error'
    });
    harness.detectChanges();
    expect(text()).toContain('Suppression impossible');
    expect(detail().student).toEqual(student);
    expect(detail().deleting).toBe(false);
  });

  it('clears the session and redirects to login after a backend 401', async () => {
    await harness.navigateByUrl('/students');
    http.expectOne('/api/students').flush(null, { status: 401, statusText: 'Unauthorized' });
    await harness.fixture.whenStable();
    expect(userService.token()).toBeNull();
    expect(TestBed.inject(Router).url).toContain('/login?returnUrl=');
  });

  it('never forwards the token to another origin or registration', () => {
    const client = TestBed.inject(HttpClient);
    for (const url of ['https://example.com/api/students', '/api/register']) {
      client.get(url).subscribe();
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    }
  });

  it('omits the id even if a student entity is passed to create or update', () => {
    const service = TestBed.inject(StudentService);
    service.create(student).subscribe();
    const create = http.expectOne('/api/students');
    expect(create.request.body).toEqual(body);
    create.flush(student);
    service.update(42, student).subscribe();
    const update = http.expectOne('/api/students/42');
    expect(update.request.body).toEqual(body);
    update.flush(student);
  });
});
