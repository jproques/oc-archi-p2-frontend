import { loginViaUi, registerViaApi, testUser } from '../support/test-data';

describe('Inscription et connexion', () => {
  const user = testUser();

  before(() => registerViaApi(user));

  it('affiche les champs obligatoires sans envoyer une inscription invalide', () => {
    cy.intercept('POST', '/api/register', () => {
      throw new Error('Un formulaire invalide ne doit pas appeler l’API');
    });
    cy.visit('/register');
    cy.contains('button', 'Register').click();
    for (const message of ['First Name is required', 'Last Name is required',
      'Login is required', 'password is required']) {
      cy.contains(message).should('be.visible');
    }
    cy.location('pathname').should('eq', '/register');
  });

  it('enregistre un utilisateur puis permet de se connecter avec ce compte', () => {
    const newUser = testUser();
    cy.intercept('POST', '/api/register').as('register');
    cy.visit('/register');
    for (const field of ['firstName', 'lastName', 'login', 'password'] as const) {
      cy.get(`[formControlName="${field}"]`).type(newUser[field], { log: field !== 'password' });
    }
    cy.contains('button', 'Register').click();
    cy.wait('@register').then(({ request, response }) => {
      expect(request.body).to.deep.equal(newUser);
      expect(response?.statusCode).to.eq(201);
    });
    cy.location('pathname').should('eq', '/login');
    loginViaUi(newUser);
  });

  it('connecte un utilisateur et transmet le JWT pour charger les étudiants', () => {
    cy.intercept('GET', '/api/students').as('students');
    loginViaUi(user);
    cy.wait('@students').then(({ request, response }) => {
      expect(request.headers['authorization']).to.match(/^Bearer [^.]+\.[^.]+\.[^.]+$/);
      expect(response?.statusCode).to.eq(200);
    });
  });

  it('affiche une erreur lorsque le mot de passe est incorrect', () => {
    cy.intercept('POST', '/api/login').as('failedLogin');
    cy.visit('/login');
    cy.get('#login').type(user.login);
    cy.get('#password').type('WrongPassword!', { log: false });
    cy.contains('button', 'Se connecter').click();
    cy.wait('@failedLogin').its('response.statusCode').should('be.oneOf', [400, 401]);
    cy.get('[role="alert"]').should('be.visible').and('not.be.empty');
    cy.contains('button', 'Se connecter').should('be.enabled');
    cy.location('pathname').should('eq', '/login');
  });

  it('protège les écrans et revient à la page demandée après connexion', () => {
    cy.visit('/students/new');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', '?returnUrl=%2Fstudents%2Fnew');
    cy.get('#login').type(user.login);
    cy.get('#password').type(user.password, { log: false });
    cy.contains('button', 'Se connecter').click();
    cy.location('pathname').should('eq', '/students/new');
    cy.contains('h1', 'Ajouter un étudiant').should('be.visible');
    cy.contains('button', 'Se déconnecter').click();
    cy.location('pathname').should('eq', '/login');
    cy.visit('/students');
    cy.location('pathname').should('eq', '/login');
  });
});
