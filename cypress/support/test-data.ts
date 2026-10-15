import type { Register } from '../../src/app/core/models/Register';
import type { Student } from '../../src/app/core/models/Student';

export function testUser(): Register {
  const suffix = `${Date.now()}-${Cypress._.random(100000, 999999)}`;
  return {
    firstName: 'Cypress', lastName: 'E2E', login: `cypress-${suffix}`,
    password: `TestOnly-${suffix}!`
  };
}

export function testStudent(): Student {
  const suffix = `${Date.now()}-${Cypress._.random(100000, 999999)}`;
  return {
    firstName: 'Alice', lastName: `Cypress-${suffix}`, email: `cypress-${suffix}@example.com`,
    dateOfBirth: '2000-04-12', placeOfBirth: 'Paris'
  };
}

export function registerViaApi(user: Register) {
  return cy.request('POST', '/api/register', user).its('status').should('eq', 201);
}

// Authentication lives in an Angular signal, so restoring cookies or storage
// with cy.session() would not restore this application's session.
export function loginViaUi(user: Register) {
  cy.intercept('POST', '/api/login').as('login');
  cy.visit('/login');
  cy.get('#login').type(user.login);
  cy.get('#password').type(user.password, { log: false });
  cy.contains('button', 'Se connecter').click();
  cy.wait('@login').then(({ request, response }) => {
    expect(request.body).to.deep.equal({ login: user.login, password: user.password });
    expect(response?.statusCode).to.eq(200);
    expect(response?.body).to.be.a('string').and.match(/^[^.]+\.[^.]+\.[^.]+$/);
  });
  cy.location('pathname').should('eq', '/students');
  cy.contains('h1', 'Étudiants').should('be.visible');
}

export function fillStudentForm(student: Student) {
  for (const field of ['firstName', 'lastName', 'email', 'dateOfBirth', 'placeOfBirth'] as const) {
    cy.get(`#${field}`).clear().type(student[field]);
  }
}

export function assertStudentDetail(student: Student) {
  cy.contains('h1', 'Détail de l’étudiant').should('be.visible');
  for (const value of [student.firstName, student.lastName, student.email, student.placeOfBirth]) {
    cy.get('dl').should('contain.text', value);
  }
  const [year, month, day] = student.dateOfBirth.split('-');
  cy.get('dl').should('contain.text', `${day}/${month}/${year}`);
}
