import { Routes } from '@angular/router';
import {RegisterComponent} from './pages/register/register.component';
import {LoginComponent} from './pages/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { StudentsComponent } from './pages/students/students.component';
import { StudentListComponent } from './pages/students/student-list.component';
import { StudentDetailComponent } from './pages/students/student-detail.component';
import { StudentFormComponent } from './pages/students/student-form.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'students',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'students',
    component: StudentsComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', component: StudentListComponent },
      { path: 'new', component: StudentFormComponent },
      { path: ':id/edit', component: StudentFormComponent },
      { path: ':id', component: StudentDetailComponent }
    ]
  },
  {
    path: '**',
    redirectTo: 'students'
  }

];
