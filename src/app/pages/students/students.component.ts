import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { UserService } from '../../core/service/user.service';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <main class="students-page">
      <nav aria-label="Gestion des étudiants">
        <a routerLink="/students">Liste des étudiants</a>
        <a routerLink="/students/new">Ajouter un étudiant</a>
        <button type="button" (click)="logout()">Se déconnecter</button>
      </nav>
      <router-outlet />
    </main>
  `
})
export class StudentsComponent {
  private userService = inject(UserService);
  private router = inject(Router);

  logout(): void {
    this.userService.logout();
    void this.router.navigate(['/login']);
  }
}
