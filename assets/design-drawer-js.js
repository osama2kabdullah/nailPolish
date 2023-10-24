/*!
 * Based on articles on
 * https://gomakethings.com
 */

var drawer = function () {
  /**
   * Element.closest() polyfill
   * https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#Polyfill
   */
  if (!Element.prototype.closest) {
    if (!Element.prototype.matches) {
      Element.prototype.matches =
        Element.prototype.msMatchesSelector ||
        Element.prototype.webkitMatchesSelector;
    }
    Element.prototype.closest = function (s) {
      var el = this;
      var ancestor = this;
      if (!document.documentElement.contains(el)) return null;
      do {
        if (ancestor.matches(s)) return ancestor;
        ancestor = ancestor.parentElement;
      } while (ancestor !== null);
      return null;
    };
  }

  // Trap Focus
  // https://hiddedevries.nl/en/blog/2017-01-29-using-javascript-to-trap-focus-in-an-element
  //
  function trapFocus(element) {
    var focusableEls = element.querySelectorAll(
      'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])'
    );
    var firstFocusableEl = focusableEls[0];
    var lastFocusableEl = focusableEls[focusableEls.length - 1];
    var KEYCODE_TAB = 9;

    element.addEventListener("keydown", function (e) {
      var isTabPressed = e.key === "Tab" || e.keyCode === KEYCODE_TAB;

      if (!isTabPressed) {
        return;
      }

      if (e.shiftKey) {
        /* shift + tab */ if (document.activeElement === firstFocusableEl) {
          lastFocusableEl.focus();
          e.preventDefault();
        }
      } /* tab */ else {
        if (document.activeElement === lastFocusableEl) {
          firstFocusableEl.focus();
          e.preventDefault();
        }
      }
    });
  }

  //
  // Settings
  //
  var settings = {
    speedOpen: 50,
    speedClose: 350,
    activeClass: "is-active",
    visibleClass: "is-visible",
    selectorTarget: "[data-drawer-target]",
    selectorTrigger: "[data-drawer-trigger]",
    selectorClose: "[data-drawer-close]",
  };

  //
  // Methods
  //
  let triggerImage = "";

  // Toggle accessibility
  var toggleAccessibility = function (event) {
    // found input
    triggerImage = event;
    if (event.getAttribute("aria-expanded") === "true") {
      event.setAttribute("aria-expanded", false);
    } else {
      event.setAttribute("aria-expanded", true);
    }
  };

  // Open Drawer
  var openDrawer = function (trigger) {
    // Find target
    var target = document.getElementById(trigger.getAttribute("aria-controls"));

    // Make it active
    target.classList.add(settings.activeClass);

    // Make body overflow hidden so it's not scrollable
    document.documentElement.style.overflow = "hidden";

    // Toggle accessibility
    toggleAccessibility(trigger);

    // Make it visible
    setTimeout(function () {
      target.classList.add(settings.visibleClass);
      trapFocus(target);
    }, settings.speedOpen);
  };

  const setImage = function (event, toImage) {
    const inputBox = event.querySelector('input[type="checkbox"]');
    if (inputBox.checked) {
      return;
    }

    const fromImage = event.querySelector("img");
    const imgSrc = fromImage.getAttribute("src");
    const indexNumber = toImage.getAttribute("index-number");

    const html = `
      <div class="selected-image-wrapper">
        <div class="cross-icond">X</div>
        <img src="${imgSrc}" alt="Alternative Text for the Image" style="width: 150px;">
        <label style="display: none;" for="${indexNumber}">Design ${indexNumber}</label>
        <input style="display: none;" type="text" value="${inputBox.name}" name="properties[Design ${indexNumber}]" id="${indexNumber}" form="${toImage.id}">
      </div>
    `;

    const divTag = document.createElement("div");
    divTag.innerHTML = html;

    toImage.parentNode.replaceChild(divTag, toImage);
    inputBox.checked = true;
    event.style.pointerEvents = "none";
    const checkboxes = document.querySelectorAll(".image-checkbox-here");
    const addBtn = document.querySelector(".product-form__submit");

    const checkedCheckboxes = Array.from(checkboxes).filter(checkbox => checkbox.checked);
    addBtn.disabled = checkedCheckboxes.length !== 4;

    const crossDiv = divTag.querySelector(".cross-icond");
    crossDiv.addEventListener("click", function () {
      divTag.parentNode.replaceChild(toImage, divTag);
      inputBox.checked = false;
      event.style.pointerEvents = "auto";
      const checkboxes = document.querySelectorAll(".image-checkbox-here");
      const addBtn = document.querySelector(".product-form__submit");
      const checkedCheckboxes = Array.from(checkboxes).filter(checkbox => checkbox.checked);
      addBtn.disabled = checkedCheckboxes.length !== 4;
    });
  };

  // Close Drawer
  var closeDrawer = function (event) {
    // Check if an img tag exists inside the triggerImage element
    var imgTag = event.querySelector("img");
    if (imgTag) {
      setImage(event, triggerImage);
    } else {
      console.log("No img tag found inside the element.");
    }
    //found image that is want to add

    // Find target
    var closestParent = event.closest(settings.selectorTarget),
      childrenTrigger = document.querySelector(
        '[aria-controls="' + closestParent.id + '"'
      );

    // Make it not visible
    closestParent.classList.remove(settings.visibleClass);

    // Remove body overflow hidden
    document.documentElement.style.overflow = "";

    // Toggle accessibility
    toggleAccessibility(childrenTrigger);

    // Make it not active
    setTimeout(function () {
      closestParent.classList.remove(settings.activeClass);
    }, settings.speedClose);
  };

  // Click Handler
  var clickHandler = function (event) {
    // Find elements
    var toggle = event.target,
      open = toggle.closest(settings.selectorTrigger),
      close = toggle.closest(settings.selectorClose);

    // Open drawer when the open button is clicked
    if (open) {
      openDrawer(open);
    }

    // Close drawer when the close button (or overlay area) is clicked
    if (close) {
      closeDrawer(close);
    }

    // Prevent default link behavior
    if (open || close) {
      event.preventDefault();
    }
  };

  // Keydown Handler, handle Escape button
  var keydownHandler = function (event) {
    if (event.key === "Escape" || event.keyCode === 27) {
      // Find all possible drawers
      var drawers = document.querySelectorAll(settings.selectorTarget),
        i;

      // Find active drawers and close them when escape is clicked
      for (i = 0; i < drawers.length; ++i) {
        if (drawers[i].classList.contains(settings.activeClass)) {
          closeDrawer(drawers[i]);
        }
      }
    }
  };

  //
  // Inits & Event Listeners
  //
  document.addEventListener("click", clickHandler, false);
  document.addEventListener("keydown", keydownHandler, false);
};

drawer();
