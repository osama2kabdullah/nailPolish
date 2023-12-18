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
    /**
     * event: selected drawer product
     * toImage: input box
     */
    const inputBox = event.querySelector('input[type="checkbox"]');
    if (inputBox.checked) {
      // return;
    }
    const fromImage = event.querySelector("img");
    const formId = toImage.getAttribute("form-id");
    const imgSrc = fromImage.getAttribute("src");
    const indexNumber = toImage.getAttribute("index-number");
    const requredNumber = parseInt(toImage.getAttribute("requred-number"));
    const isOptional = toImage.getAttribute("optional");
    const selectedVariantId = inputBox.getAttribute("varId");
    const selectedVariantQty = inputBox.getAttribute("quantity");
    if (selectedVariantQty) {
      const newQuantity = parseInt(selectedVariantQty) - 1;
      inputBox.setAttribute("quantity", newQuantity);
      if (newQuantity < 1) {
        inputBox.parentElement.parentElement.classList.add("unavaibale-darwer-product")
      }
    }

    const html = `
      <div class="selected-image-wrapper">
        <div class="cross-icond">X</div>
        <img src="${imgSrc}" alt="Alternative Text for the Image" style="width: 100%;">
        <label style="text-align: center; display: block;" for="${indexNumber}">Design ${indexNumber}</label>
        <input variant-id="${selectedVariantId}" isOptional="${isOptional}" style="display: none;" type="text" value="${inputBox.name}" name="properties[_Design ${indexNumber}]" id="${indexNumber}" form="${formId}">
        <input style="display: none;" type="text" value="${inputBox.getAttribute("product-name")}" name="properties[Design ${indexNumber}]" id="${indexNumber+1}" form="${formId}">
      </div>
    `;

    const divTag = document.createElement("div");
    divTag.innerHTML = html;

    const parentElement = toImage.parentNode;
    parentElement.replaceChild(divTag, toImage); // Replace divTag with toImage
    if (isOptional === "true") {
      var currentNumber = parseInt(toImage.getAttribute("index-number"), 10);
      toImage.setAttribute("index-number", (currentNumber + 1).toString());
      parentElement.insertBefore(toImage, divTag.nextSibling); // Insert toImage after divTag
      toImage.querySelector(".design-name").innerText =
        "Design " + (currentNumber + 1).toString();
    }

    inputBox.checked = true;
    // event.style.pointerEvents = "none";
    const addBtn = document.querySelector(".product-form__submit");

    const checkedCheckboxes = document.querySelectorAll(
      'input[isOptional="false"]'
    );
    addBtn.disabled = checkedCheckboxes.length < requredNumber;

    const crossDiv = divTag.querySelector(".cross-icond");

    crossDiv.addEventListener("click", function () {
      if (isOptional == "true") {
        divTag.parentNode.removeChild(divTag);
        const remain = document.querySelectorAll('input[isOptional="true"]');
        remain.forEach((el, index) => {
          const inputEl = el;
          const labelEl = document.querySelector('label[for="' + el.id + '"]');
          inputEl.id = requredNumber + 1 + index;
          inputEl.name = `properties[Design ${requredNumber + 1 + index}]`;
          labelEl.htmlFor = requredNumber + 1 + index;
          labelEl.innerText = `Design ${requredNumber + 1 + index}`;
        });
        toImage.setAttribute("index-number", requredNumber + 1 + remain.length);
        toImage.querySelector(".design-name").innerText =
          "Design " + (requredNumber + 1 + remain.length).toString();
      } else {
        divTag.parentNode.replaceChild(toImage, divTag);
      }

      const selectedVariantQty = inputBox.getAttribute("quantity");
      if (selectedVariantQty) {
        if (selectedVariantQty < 1) {
          inputBox.parentElement.parentElement.classList.remove("unavaibale-darwer-product");
        }
        const newQuantity = parseInt(selectedVariantQty) + 1;
        inputBox.setAttribute("quantity", newQuantity);
      }
      inputBox.checked = false;
      // event.style.pointerEvents = "auto";
      const addBtn = document.querySelector(".product-form__submit");
      const checkedCheckboxes = document.querySelectorAll(
        'input[isOptional="false"]'
      );
      addBtn.disabled = checkedCheckboxes.length < requredNumber;
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
