<header class="site-header">

  <!-- ========================================================================= -->
  <!-- 1. TOP UTILITY BAR (Conditional: Only renders if topbar pages or contact) -->
  <!-- ========================================================================= -->
 
  <div class="">
    <div class="">
      
      
      <div class="\">
       
          <span><i class=""></i> 000000000000</span>
       
          <span class=""><i class=""></i> abc@abc.abc</span>
         
      </div>
     
      <div class="">
        {{#each MainMenuItems="top"}}
          <a href="{{ Url }}" class="{{ CustomClass }}">
            {{ Title }}
          </a>
        {{/each}}
        
      
      </div>

    </div>
  </div>
 



   <nav class="">
    <div class="">

      <!-- BRAND LOGO ALWAYS COMES FIRST -->
      <a class="" href="{{ HomeUrl }}">
        {{#if BrandLogo}}
          <img src="{{ BrandLogo }}" alt="{{ BrandName }}"  />
        {{else}}
          <span class="">{{ BrandName }}</span>
        {{/if}}
      </a>

      <!-- Mobile Toggle Button -->
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbarContent">
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- NAVIGATION ZONES (FIRST, MIDDLE, LAST) -->
      <div class="collapse navbar-collapse d-flex justify-content-between" id="mainNavbarContent">
        <ul class="navbar-nav align-items-center gap-2">

          <!-- ================================================== -->
          <!-- 1. FIRST ZONE (If no first items, ignored)        -->
          <!-- ================================================== -->
           
            {{#each NavItems="first"}}
              {{#if IsDropdown}}
                <li class="nav-item dropdown {{ CustomClass }}">
                  <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                    {{ Title }}
                  </a>
                  {{#if Pages}}
                  <ul class="dropdown-menu">
                    {{#each Pages}}
                      <li>
                        <a class="dropdown-item {{ CustomClass }}" href="{{ Url }}">{{ Title }}</a>
                      </li>
                    {{/each}}
                  </ul>
                  {{/if}}
                </li>
              {{else}}
                <li class="nav-item {{ CustomClass }}">
                  <a class="nav-link {{#if @first}}active{{/if}}" href="{{ Url }}">{{ Title }}</a>
                </li>
              {{/if}}
            {{/each}}
          

          <!-- ================================================== -->
          <!-- 2. MIDDLE ZONE (If no middle items, ignored)      -->
          <!-- ================================================== -->
        
           {{#each NavItems="middle"}}
              {{#if IsDropdown}}
                <li class="nav-item dropdown {{ CustomClass }}">
                  <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                    {{ Title }}
                  </a>
                  {{#if Pages}}
                  <ul class="dropdown-menu">
                    {{#each Pages}}
                      <li>
                        <a class="dropdown-item {{ CustomClass }}" href="{{ Url }}">{{ Title }}</a>
                      </li>
                    {{/each}}
                  </ul>
                  {{/if}}
                </li>
              {{else}}
                <li class="nav-item {{ CustomClass }}">
                  <a class="nav-link" href="{{ Url }}">{{ Title }}</a>
                </li>
              {{/if}}
            {{/each}}
          


          <!-- ================================================================= -->
          <!-- 3. LAST ZONE (If no last items, ignored)                          -->
          <!-- ================================================================= -->
          

            {{#each NavItems="last"}}
              {{#if IsDropdown}}
                <li class="nav-item dropdown {{ CustomClass }}">
                  <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                    {{ Title }}
                  </a>
                  {{#if Pages}}
                  <ul class="dropdown-menu dropdown-menu-end">
                    {{#each Pages}}
                      <li>
                        <a class="dropdown-item {{ CustomClass }}" href="{{ Url }}">{{ Title }}</a>
                      </li>
                    {{/each}}
                  </ul>
                  {{/if}}
                </li>
              {{else}}
                <li class="nav-item {{ CustomClass }}">
                  <a class="nav-link" href="{{ Url }}">{{ Title }}</a>
                </li>
              {{/if}}
            {{/each}}

          <!-- ========================================================================= -->
          <!-- RULE: IF NAVBAR HAS NO CTA AREA -> PLACE LOGIN AS LAST ITEM IN THIS UL:   -->
          <!-- <li class="nav-item"><a class="nav-link" href="{{ LoginUrl }}">{{ LoginText }}</a></li> -->
          <!-- ========================================================================= -->

        </ul>

        <!-- ========================================================================= -->
        <!-- 4. ACTION CTAS & LOGIN (WHEN CTA AREA EXISTS: PLACE LOGIN ALONGSIDE CTAS) -->
        <!-- ========================================================================= -->
        <div class="navbar-actions d-flex align-items-center gap-2">
          <!-- Dynamic Login Link alongside CTA loop -->
          <a class="nav-link auth-link" href="{{ LoginUrl }}">{{ LoginText }}</a>

          <!-- Dynamic Action / CTA Buttons -->
          {{#each MenuCtaButtons}}
            <a class="btn btn-primary btn-sm rounded-pill px-3 {{ CustomClass }}" href="{{ Url }}">
              {{ Title }}
            </a>
          {{/each}}
        </div>

      </div>

    </div>
  </nav>

</header>