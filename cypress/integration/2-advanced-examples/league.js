const requiredLeague = require("../../fixtures/league");

context("Files", () => {
  beforeEach(() => {
    cy.visit("https://maps.littleleague.org/leaguefinder/");
  });

  it("loads the same object", () => {
    cy.fixture("league").then((leagueFixture) => {
      expect(requiredLeague, "the same data").to.deep.equal(leagueFixture);
    });
  });

  describe("Find the league", () => {
    beforeEach(() => {
      cy.visit("https://maps.littleleague.org/leaguefinder/");
    });
    it("enter details and submit", () => {
      cy.fixture("league").then((leagueFixture) => {
        leagueFixture.forEach((kid) => {
          cy.log(kid)
          if (kid.baseballAge !== null) {
            cy.get("#sport-type-input").select("Baseball");
          } else {
            cy.get("#sport-type-input").select("Softball");
          }
          cy.get("#address-input").type(
            kid.address + " " + kid.city + " " + kid.state + " " + kid.zip
          );
          cy.get('#search-button').click();
          it("should have a link to the league", () => {
            cy.get(".col-md-12 > .header").should("contain", "WALNUT CREEK LL");
          });

          // in a real test you probably need to do some kind of assertion here
        });
      });
    });
  });

  // it("should loop through each kid", () => {
  //   requiredLeague.forEach((kid) => {
  //     if (kid.baseballAge !== null) {
  //       cy.get("#sport-type-input").select("Baseball");
  //     } else {
  //       cy.get("#sport-type-input").select("Softball");
  //     }
  //     cy.get("#address-input").type(
  //       kid.address + " " + kid.city + " " + kid.state + " " + kid.zip
  //     );
  //     // cy.get('#search-button').click();
  //     it("should have a link to the league", () => {
  //       cy.get(".col-md-12 > .header").should("contain", "WALNUT CREEK LL");
  //     });
  //   });
  // });
});
