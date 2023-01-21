const requiredLeague = require("../../fixtures/league-2023");

context("Files", () => {
  describe("Find the league", () => {
    beforeEach(() => {
      cy.visit("https://maps.littleleague.org/leaguefinder/");
    });

    for (let i = 0; i < requiredLeague.length; i++) {
      let kid = requiredLeague[i];
      it(`${kid.lastname}, ${kid.firstname}`, () => {
        cy.log(kid.firstname, kid.lastname);
        if (kid.baseballAge !== null) {
          cy.get("#sport-type-input").select("Baseball");
        } else {
          cy.get("#sport-type-input").select("Softball");
        }
        cy.get("#address-input").type(
          kid.address + " " + kid.city + " " + kid.state + " " + kid.zip
        );
        cy.get("#search-button").click();
        cy.get(".col-md-12 > .header").should("contain", "WALNUT CREEK LL");
      });
    }
  });
});
