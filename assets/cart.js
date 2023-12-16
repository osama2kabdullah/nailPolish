class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener("click", (event) => {
      event.preventDefault();
      const varinatData = this.associatedProducts(); // bundCurrValue
      const cartItems =
        this.closest("cart-items") || this.closest("cart-drawer-items");
      cartItems.updateQuantity(varinatData, this.dataset.index, 0);
    });
  }

  associatedProducts() {
    const element = this;
    const variantsStr = element.getAttribute("optionalVariants");
    const variantsLineStr = element.getAttribute("bundleVariantsLine");

    const varinatsArray = variantsStr
      .split(",")
      .filter((value) => value !== "");
    const bundleVarLineArr = variantsLineStr
      .split(",")
      .filter((value) => value !== "");

    const varwithQty = [];
    varinatsArray.forEach((element, index) => {
      varwithQty.push({
        id: element,
        qty: 0,
        line: bundleVarLineArr[index],
      });
    });
    return varwithQty;
  }
}

customElements.define("cart-remove-button", CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById("shopping-cart-line-item-status") ||
      document.getElementById("CartDrawer-LineItemStatus");

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener("change", debouncedOnChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(
      PUB_SUB_EVENTS.cartUpdate,
      (event) => {
        if (event.source === "cart-items") {
          return;
        }
        this.onCartUpdate();
      }
    );
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  onChange(event) {
    const line = event.target.dataset.index;
    const quantity = event.target.value;
    const name = document.activeElement.getAttribute("name");
    const variantId = event.target.dataset.quantityVariantId;

    const DsireSelector =
      event.target.parentElement.parentElement.parentElement.querySelector(
        "cart-remove-button"
      );

    const optionalVarStr = DsireSelector.getAttribute("optionalVariants");
    const optionalLineStr = DsireSelector.getAttribute("bundleVariantsLine");

    const optionalvar = optionalVarStr
      .split(",")
      .filter((value) => value !== "");
    const optionalLineArray = optionalLineStr
      .split(",")
      .filter((value) => value !== "");

    const varwithQty = [];
    optionalvar.forEach((element, index) => {
      varwithQty.push({
        id: element,
        qty: quantity,
        line: optionalLineArray[index],
      });
    });

    // make array of object
    this.updateQuantity(varwithQty, line, quantity, name, variantId);
  }

  onCartUpdate() {
    if (this.tagName === "CART-DRAWER-ITEMS") {
      fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(
            responseText,
            "text/html"
          );
          const selectors = ["cart-drawer-items", ".cart-drawer__footer"];
          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if (targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      fetch(`${routes.cart_url}?section_id=main-cart-items`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(
            responseText,
            "text/html"
          );
          const sourceQty = html.querySelector("cart-items");
          this.innerHTML = sourceQty.innerHTML;
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender() {
    return [
      {
        id: "main-cart-items",
        section: document.getElementById("main-cart-items").dataset.id,
        selector: ".js-contents",
      },
      {
        id: "cart-icon-bubble",
        section: "cart-icon-bubble",
        selector: ".shopify-section",
      },
      {
        id: "cart-live-region-text",
        section: "cart-live-region-text",
        selector: ".shopify-section",
      },
      {
        id: "main-cart-footer",
        section: document.getElementById("main-cart-footer").dataset.id,
        selector: ".js-contents",
      },
    ];
  }

  async updateQuantity(optionalvar, lineId, quantity, name, variantId) {
    
    if (optionalvar.length) {
      document.body.style.pointerEvents = "none";
    }

    let line = lineId;
    this.enableLoading(line);
    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    async function callApi() {
      try {
        const response = await fetch(`${routes.cart_change_url}`, {
          ...fetchConfig(),
          ...{ body },
        });

        const state = await response.text();
        let parsedState = JSON.parse(state);

        const quantityElement =
          document.getElementById(`Quantity-${line}`) ||
          document.getElementById(`Drawer-quantity-${line}`);
        const items = document.querySelectorAll(".cart-item");

        if (parsedState.errors) {
          quantityElement.value = quantityElement.getAttribute("value");
          this.updateLiveRegions(line, parsedState.errors);
          return;
        }

        this.classList.toggle("is-empty", parsedState.item_count === 0);
        const cartDrawerWrapper = document.querySelector("cart-drawer");
        const cartFooter = document.getElementById("main-cart-footer");

        if (cartFooter)
          cartFooter.classList.toggle("is-empty", parsedState.item_count === 0);
        if (cartDrawerWrapper)
          cartDrawerWrapper.classList.toggle(
            "is-empty",
            parsedState.item_count === 0
          );

        this.getSectionsToRender().forEach((section) => {
          const elementToReplace =
            document
              .getElementById(section.id)
              .querySelector(section.selector) ||
            document.getElementById(section.id);
          elementToReplace.innerHTML = this.getSectionInnerHTML(
            parsedState.sections[section.section],
            section.selector
          );
        });

        const updatedValue = parsedState.items[line - 1]
          ? parsedState.items[line - 1].quantity
          : undefined;
        let message = "";
        if (
          items.length === parsedState.items.length &&
          updatedValue !== parseInt(quantityElement.value)
        ) {
          if (typeof updatedValue === "undefined") {
            message = window.cartStrings.error;
          } else {
            message = window.cartStrings.quantityError.replace(
              "[quantity]",
              updatedValue
            );
          }
        }
        this.updateLiveRegions(line, message);

        const lineItem =
          document.getElementById(`CartItem-${line}`) ||
          document.getElementById(`CartDrawer-Item-${line}`);
        if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
          cartDrawerWrapper
            ? trapFocus(
                cartDrawerWrapper,
                lineItem.querySelector(`[name="${name}"]`)
              )
            : lineItem.querySelector(`[name="${name}"]`).focus();
        } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
          trapFocus(
            cartDrawerWrapper.querySelector(".drawer__inner-empty"),
            cartDrawerWrapper.querySelector("a")
          );
        } else if (document.querySelector(".cart-item") && cartDrawerWrapper) {
          trapFocus(
            cartDrawerWrapper,
            document.querySelector(".cart-item__name")
          );
        }

        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: "cart-items",
          cartData: parsedState,
          variantId: variantId,
        });
      } catch (error) {
        this.querySelectorAll(".loading-overlay").forEach((overlay) =>
          overlay.classList.add("hidden")
        );
        const errors =
          document.getElementById("cart-errors") ||
          document.getElementById("CartDrawer-CartErrors");
        errors.textContent = window.cartStrings.error;
      } finally {
        this.disableLoading(line);
      }
    }
    // Calling the async function
    await callApi.call(this);

    if (optionalvar.length) {
      const updateOptional = this.updateOptionalProducts(optionalvar, name);
    }
  }

  async updateOptionalProducts(variants, name) {
    for (const variant of variants) {
      let line = variant.line;
      if (!name) {
        line = variants[0].line;
      }
      const quantity = variant.qty;
      const variantId = "";
      await this.updateOthersLine(line, quantity, name, variantId);
    }
    document.body.style.pointerEvents = "auto";
  }

  async updateOthersLine(line, quantity, name, variantId) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });
    try {
      const response = await fetch(`${routes.cart_change_url}`, {
        ...fetchConfig(),
        ...{ body },
      });

      const state = await response.text();
      let parsedState = JSON.parse(state);

      const quantityElement =
        document.getElementById(`Quantity-${line}`) ||
        document.getElementById(`Drawer-quantity-${line}`);
      const items = document.querySelectorAll(".cart-item");

      if (parsedState.errors) {
        quantityElement.value = quantityElement.getAttribute("value");
        this.updateLiveRegions(line, parsedState.errors);
        return;
      }

      this.classList.toggle("is-empty", parsedState.item_count === 0);
      const cartDrawerWrapper = document.querySelector("cart-drawer");
      const cartFooter = document.getElementById("main-cart-footer");

      if (cartFooter)
        cartFooter.classList.toggle("is-empty", parsedState.item_count === 0);
      if (cartDrawerWrapper)
        cartDrawerWrapper.classList.toggle(
          "is-empty",
          parsedState.item_count === 0
        );

      this.getSectionsToRender().forEach((section) => {
        const elementToReplace =
          document.getElementById(section.id).querySelector(section.selector) ||
          document.getElementById(section.id);
        elementToReplace.innerHTML = this.getSectionInnerHTML(
          parsedState.sections[section.section],
          section.selector
        );
      });

      const updatedValue = parsedState.items[line - 1]
        ? parsedState.items[line - 1].quantity
        : undefined;
      let message = "";
      if (
        items.length === parsedState.items.length &&
        updatedValue !== parseInt(quantityElement.value)
      ) {
        if (typeof updatedValue === "undefined") {
          message = window.cartStrings.error;
        } else {
          message = window.cartStrings.quantityError.replace(
            "[quantity]",
            updatedValue
          );
        }
      }
      this.updateLiveRegions(line, message);

      const lineItem =
        document.getElementById(`CartItem-${line}`) ||
        document.getElementById(`CartDrawer-Item-${line}`);
      if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
        cartDrawerWrapper
          ? trapFocus(
              cartDrawerWrapper,
              lineItem.querySelector(`[name="${name}"]`)
            )
          : lineItem.querySelector(`[name="${name}"]`).focus();
      } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
        trapFocus(
          cartDrawerWrapper.querySelector(".drawer__inner-empty"),
          cartDrawerWrapper.querySelector("a")
        );
      } else if (document.querySelector(".cart-item") && cartDrawerWrapper) {
        trapFocus(
          cartDrawerWrapper,
          document.querySelector(".cart-item__name")
        );
      }

      publish(PUB_SUB_EVENTS.cartUpdate, {
        source: "cart-items",
        cartData: parsedState,
        variantId: variantId,
      });
    } catch (error) {
      this.querySelectorAll(".loading-overlay").forEach((overlay) =>
        overlay.classList.add("hidden")
      );
      const errors =
        document.getElementById("cart-errors") ||
        document.getElementById("CartDrawer-CartErrors");
      errors.textContent = window.cartStrings.error;
    } finally {
      this.disableLoading(line);
    }
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) ||
      document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError)
      lineItemError.querySelector(".cart-item__error-text").innerHTML = message;

    this.lineItemStatusElement.setAttribute("aria-hidden", true);

    const cartStatus =
      document.getElementById("cart-live-region-text") ||
      document.getElementById("CartDrawer-LiveRegionText");
    cartStatus.setAttribute("aria-hidden", false);

    setTimeout(() => {
      cartStatus.setAttribute("aria-hidden", true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems =
      document.getElementById("main-cart-items") ||
      document.getElementById("CartDrawer-CartItems");
    mainCartItems.classList.add("cart__items--disabled");

    const cartItemElements = this.querySelectorAll(
      `#CartItem-${line} .loading-overlay`
    );
    const cartDrawerItemElements = this.querySelectorAll(
      `#CartDrawer-Item-${line} .loading-overlay`
    );

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) =>
      overlay.classList.remove("hidden")
    );

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute("aria-hidden", false);
  }

  disableLoading(line) {
    const mainCartItems =
      document.getElementById("main-cart-items") ||
      document.getElementById("CartDrawer-CartItems");
    mainCartItems.classList.remove("cart__items--disabled");

    const cartItemElements = this.querySelectorAll(
      `#CartItem-${line} .loading-overlay`
    );
    const cartDrawerItemElements = this.querySelectorAll(
      `#CartDrawer-Item-${line} .loading-overlay`
    );

    cartItemElements.forEach((overlay) => overlay.classList.add("hidden"));
    cartDrawerItemElements.forEach((overlay) =>
      overlay.classList.add("hidden")
    );
  }
}

customElements.define("cart-items", CartItems);

if (!customElements.get("cart-note")) {
  customElements.define(
    "cart-note",
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          "change",
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, {
              ...fetchConfig(),
              ...{ body },
            });
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }
    }
  );
}
