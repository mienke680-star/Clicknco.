(function(){
  var header = document.querySelector("#header");
  var menuBtn = document.querySelector("#menuBtn");
  var mobileMenu = document.querySelector("#mobileMenu");

  function closeMenu(){
    menuBtn.classList.remove("open");
    mobileMenu.classList.remove("open");
    document.body.classList.remove("menu-open");
    menuBtn.setAttribute("aria-expanded","false");
    menuBtn.setAttribute("aria-label","Open menu");
    mobileMenu.setAttribute("aria-hidden","true");
  }
  if(menuBtn && mobileMenu){
    menuBtn.addEventListener("click", function(){
      var open = !mobileMenu.classList.contains("open");
      menuBtn.classList.toggle("open", open);
      mobileMenu.classList.toggle("open", open);
      document.body.classList.toggle("menu-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      mobileMenu.setAttribute("aria-hidden", String(!open));
    });
    mobileMenu.querySelectorAll("a").forEach(function(a){ a.addEventListener("click", closeMenu); });
  }

  // active nav link by current page
  var path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".navlinks a, .mobile-menu nav a").forEach(function(a){
    var href = a.getAttribute("href");
    if(href === path || (path === "" && href === "index.html")){
      a.classList.add("active");
    }
  });

  // reveal on scroll
  var reveals = document.querySelectorAll(".reveal");
  if(reveals.length){
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    reveals.forEach(function(el){ observer.observe(el); });
  }

  if(header){
    function onScroll(){ header.classList.toggle("scrolled", scrollY > 16); }
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var yearEl = document.querySelector("#year");
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  var siteUrl = document.querySelector("#siteUrl");
  if(siteUrl){
    siteUrl.textContent = location.hostname && location.hostname !== "localhost" ? location.hostname : "Your website";
    siteUrl.href = location.origin;
  }

  var form = document.querySelector("#contactForm");
  if(form){
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var nameEl = document.querySelector("#name");
      var name = nameEl.value.trim();
      if(!name){ nameEl.focus(); return; }
      var business = document.querySelector("#business").value.trim();
      var service = document.querySelector("#service").value;
      var message = document.querySelector("#message").value.trim();
      var text = "Hi CLICK & CO. My name is " + name + (business ? " from " + business : "") + ". I am interested in " + service + "." + (message ? " Project details: " + message : "");
      window.open("https://wa.me/27690522875?text=" + encodeURIComponent(text), "_blank", "noopener");
    });
  }

  // process scroll progress (process.html only)
  var processWrap = document.querySelector("#processWrap");
  var processFill = document.querySelector("#processFill");
  var steps = [].slice.call(document.querySelectorAll(".step"));
  if(processWrap && processFill){
    function onProcessScroll(){
      var r = processWrap.getBoundingClientRect();
      var vh = innerHeight;
      var progress = Math.max(0, Math.min(1, (vh*.78 - r.top) / (r.height + vh*.22)));
      if(innerWidth <= 720){ processFill.style.height = (progress*100) + "%"; }
      else{ processFill.style.width = (progress*100) + "%"; }
      steps.forEach(function(step,i){ step.classList.toggle("active", progress >= (i+.1)/steps.length); });
    }
    addEventListener("scroll", onProcessScroll, { passive: true });
    addEventListener("resize", onProcessScroll);
    onProcessScroll();
  }
})();
