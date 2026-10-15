import type { Student } from '../../src/app/core/models/Student';
import {
  assertStudentDetail, fillStudentForm, loginViaUi, registerViaApi, testStudent, testUser
} from '../support/test-data';

describe('Gestion des étudiants', () => {
  const user = testUser();
  let token: string;
  let student: Student;
  let createdIds: number[];

  before(() => {
    registerViaApi(user);
    cy.request('POST', '/api/login', { login: user.login, password: user.password })
      .then(response => {
        expect(response.status).to.eq(200);
        token = response.body;
      });
  });

  beforeEach(() => {
    student = testStudent();
    createdIds = [];
  });

  afterEach(() => {
    // Only delete the records owned by this test, never clear the whole table.
    for (const id of createdIds) {
      cy.request({
        method: 'DELETE', url: `/api/students/${id}`, failOnStatusCode: false,
        headers: { Authorization: `Bearer ${token}` }
      }).its('status').should('be.oneOf', [204, 404]);
    }
  });

  function seedStudent() {
    return cy.request<Student>({
      method: 'POST', url: '/api/students', body: student,
      headers: { Authorization: `Bearer ${token}` }
    }).then(response => {
      expect(response.status).to.eq(201);
      student = response.body;
      createdIds.push(student.id!);
    });
  }

  function studentRow() {
    return cy.contains('tbody tr', student.email);
  }

  it('affiche la liste et les informations détaillées d’un étudiant', () => {
    seedStudent();
    cy.intercept('GET', '/api/students').as('list');
    loginViaUi(user);
    cy.wait('@list').its('response.statusCode').should('eq', 200);
    studentRow().should('contain.text', student.firstName).and('contain.text', student.lastName);
    studentRow().contains('a', 'Détail').click();
    cy.then(() => assertStudentDetail(student));
  });

  it('ajoute un étudiant et affiche les données sauvegardées', () => {
    cy.intercept('POST', '/api/students').as('create');
    loginViaUi(user);
    cy.contains('a', 'Ajouter un étudiant').click();
    fillStudentForm(student);
    cy.contains('button', 'Enregistrer').click();
    cy.wait('@create').then(({ request, response }) => {
      if (response?.statusCode === 201) createdIds.push(response.body.id);
      expect(request.body).to.deep.equal(student);
      expect(response?.statusCode).to.eq(201);
    });
    cy.contains('[role="status"]', 'Étudiant créé.').should('be.visible');
    assertStudentDetail(student);
    cy.contains('a', 'Retour à la liste').click();
    studentRow().should('be.visible');
  });

  it('valide les champs avant de créer un étudiant', () => {
    cy.intercept('POST', '/api/students', () => {
      throw new Error('Un formulaire invalide ne doit pas appeler l’API');
    });
    loginViaUi(user);
    cy.contains('a', 'Ajouter un étudiant').click();
    cy.contains('button', 'Enregistrer').click();
    cy.contains('Prénom est obligatoire.').should('be.visible');
    fillStudentForm({ ...student, email: 'invalid', dateOfBirth: '2999-01-01' });
    cy.contains('button', 'Enregistrer').click();
    cy.contains('Saisissez un email valide.').should('be.visible');
    cy.contains('Saisissez une date de naissance valide, qui ne soit pas future.').should('be.visible');
    cy.location('pathname').should('eq', '/students/new');
  });

  it('modifie tous les champs et conserve les nouvelles informations', () => {
    seedStudent();
    loginViaUi(user);
    studentRow().contains('a', 'Modifier').click();
    cy.then(() => {
      for (const field of ['firstName', 'lastName', 'email', 'dateOfBirth', 'placeOfBirth'] as const) {
        cy.get(`#${field}`).should('have.value', student[field]);
      }
      const { id, ...body } = student;
      const updated = { ...body, firstName: 'Emma', lastName: `${body.lastName}-modifie`,
        email: `updated-${body.email}`, dateOfBirth: '2001-05-16', placeOfBirth: 'Lyon' };
      cy.intercept('PUT', `/api/students/${id}`).as('update');
      fillStudentForm(updated);
      cy.contains('button', 'Enregistrer').click();
      cy.wait('@update').then(({ request, response }) => {
        expect(request.body).to.deep.equal(updated);
        expect(response?.statusCode).to.eq(200);
      });
      cy.contains('[role="status"]', 'Étudiant modifié.').should('be.visible');
      assertStudentDetail(updated);
      cy.contains('a', 'Retour à la liste').click();
      cy.contains('tbody tr', updated.email).should('contain.text', updated.firstName);
    });
  });

  it('annule une suppression puis supprime l’étudiant après confirmation', () => {
    seedStudent();
    loginViaUi(user);
    studentRow().contains('a', 'Supprimer').click();
    cy.get('section[aria-label="Confirmation de suppression"]').should('be.visible');
    cy.contains('button', 'Annuler').click();
    cy.get('section[aria-label="Confirmation de suppression"]').should('not.exist');
    cy.then(() => {
      cy.request({ url: `/api/students/${student.id}`, headers: { Authorization: `Bearer ${token}` } })
        .its('status').should('eq', 200);
      cy.intercept('DELETE', `/api/students/${student.id}`).as('delete');
      cy.contains('button', 'Supprimer').click();
      cy.contains('button', 'Confirmer la suppression').click();
      cy.wait('@delete').its('response.statusCode').should('eq', 204);
      cy.location('pathname').should('eq', '/students');
      cy.contains('[role="status"]', 'Étudiant supprimé.').should('be.visible');
      cy.contains('tbody tr', student.email).should('not.exist');
      cy.request({ url: `/api/students/${student.id}`, failOnStatusCode: false,
        headers: { Authorization: `Bearer ${token}` } }).its('status').should('eq', 404);
    });
  });
});
