const isSourceActive = (value, sources) => !!sources.find((source) => source.value === value);

polarity.export = PolarityComponent.extend({
  // Hides the filter menu by default
  viewFilters: false,
  // This is the initial view limit. The user can view up to 10 by clicking on a "view more" action link
  viewLimit: 5,
  // Stores any error messages from our onMessage hook
  errorMessage: '',
  infoMessage: '',
  details: Ember.computed.alias('block.data.details'),
  searchResults: Ember.computed.alias('details.searchResults'),
  searchInformation: Ember.computed.alias('searchResults.searchInformation'),
  icons: Ember.computed.alias('details.icons'),
  searchFilters: Ember.computed.alias('block.storage.searchFilters'),
  numSourcesToSearch: Ember.computed.alias('block.storage.numSourcesToSearch'),
  init: function () {
    this._super(...arguments);

    let array = new Uint32Array(5);
    this.set('uniqueIdPrefix', window.crypto.getRandomValues(array).join(''));

    if (!this.get('block.storage.searchFilters')) {
      this.set('block.storage', {});
      const sources = this.get('block.userOptions.sources');

      this.set('block.storage.searchFilters', [
        {
          displayValue: '/ncas/analysis-reports',
          filterValue: 'https://us-cert.cisa.gov/ncas/analysis-reports',
          id: 'ar-checkbox',
          value: isSourceActive('https://us-cert.cisa.gov/ncas/analysis-reports', sources)
        },
        {
          displayValue: '/ncas/bulletins',
          filterValue: 'https://us-cert.cisa.gov/ncas/bulletins',
          id: 'b-checkbox',
          value: isSourceActive('https://us-cert.cisa.gov/ncas/bulletins', sources)
        },
        {
          displayValue: '/ncas/alerts',
          filterValue: 'https://us-cert.cisa.gov/ncas/alerts',
          id: 'a-checkbox',
          value: isSourceActive('https://us-cert.cisa.gov/ncas/alerts', sources)
        },
        {
          displayValue: '/ncas/current-activity',
          filterValue: 'https://us-cert.cisa.gov/ncas/current-activity',
          id: 'ca-checkbox',
          value: isSourceActive('https://us-cert.cisa.gov/ncas/current-activity', sources)
        },
        {
          displayValue: '/resources',
          filterValue: 'https://us-cert.cisa.gov/resources',
          id: 'r-checkbox',
          value: isSourceActive('https://us-cert.cisa.gov/resources', sources)
        },
        {
          displayValue: '/ics/alerts',
          filterValue: 'https://us-cert.cisa.gov/ics/alerts',
          id: 'icsa-checkbox',
          value: isSourceActive('https://us-cert.cisa.gov/ics/alerts', sources)
        },
        {
          displayValue: '/ics/advisories',
          filterValue: 'https://us-cert.cisa.gov/ics/advisories',
          id: 'icsad-checkbox',
          value: isSourceActive('https://us-cert.cisa.gov/ics/advisories', sources)
        },
        {
          displayValue: '/ics/Other-Reports',
          filterValue: 'https://us-cert.cisa.gov/ics/Other-Reports',
          id: 'icsor-checkbox',
          value: isSourceActive('https://us-cert.cisa.gov/ics/Other-Reports', sources)
        }
      ]);
      this.set(
        'block.storage.numSourcesToSearch',
        this.get('block.storage.searchFilters').filter(({ value }) => value).length
      );
    }
  },
  actions: {
    copyData: function () {
      const savedViewLimit = this.get('viewLimit');
      this.setMaxViewLimit();

      Ember.run.scheduleOnce(
        'afterRender',
        this,
        this.copyElementToClipboard,
        `us-cert-container-${this.get('uniqueIdPrefix')}`
      );

      Ember.run.scheduleOnce('destroy', this, this.restoreCopyState, savedViewLimit);
    },
    toggleFilter: function () {
      this.toggleProperty('viewFilters');
    },
    applyFilter: function () {
      this.set('errorMessage', '');
      this.set('infoMessage', '');

      const numSourcesToSearch = this.getNumSourcesSearched();
      if (numSourcesToSearch === 0) {
        this.set('infoMessage', 'Select at least one source to search');
        return;
      }
      this.set('filtering', true);
      const payload = {
        entity: this.block.entity,
        searchFilters: this.get('searchFilters')
      };

      this.sendIntegrationMessage(payload)
        .then((searchResults) => {
          this.set('block.data.details.searchResults', searchResults);
        })
        .catch((err) => {
          console.error(err);
          if (typeof err.meta === 'string') {
            this.set('errorMessage', err.meta);
          } else if (typeof err.meta === 'object' && typeof err.meta.error === 'string') {
            this.set('errorMessage', err.meta.error);
          } else if (typeof err.meta === 'object' && typeof err.meta.detail === 'string') {
            this.set('errorMessage', err.meta.detail);
          } else {
            this.set('errorMessage', JSON.stringify(err.meta));
          }
        })
        .finally(() => {
          this.set('numSourcesToSearch', numSourcesToSearch);
          this.set('filtering', false);
        });
    },
    selectAll: function () {
      for (let i = 0; i < this.searchFilters.length; i++) {
        this.set(`searchFilters.${i}.value`, true);
      }
    },
    clearAll: function () {
      for (let i = 0; i < this.searchFilters.length; i++) {
        this.set(`searchFilters.${i}.value`, false);
      }
    },
    viewMore: function () {
      this.setMaxViewLimit();
    }
  },
  setMaxViewLimit() {
    this.set('viewLimit', this.get('maxViewLimit'));
  },
  getNumSourcesSearched() {
    let numSourcesToSearch = 0;
    for (let i = 0; i < this.searchFilters.length; i++) {
      if (this.searchFilters[i].value === true) {
        ++numSourcesToSearch;
      }
    }
    return numSourcesToSearch;
  },
  copyElementToClipboard(element) {
    let images = document.getElementById(element).getElementsByTagName('img');
    for (let i = 0; i < images.length; i++) {
      images[i].style.display = 'none';
    }

    window.getSelection().removeAllRanges();
    let range = document.createRange();

    range.selectNode(typeof element === 'string' ? document.getElementById(element) : element);
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();

    for (let i = 0; i < images.length; i++) {
      images[i].style.display = 'block';
    }
  },
  restoreCopyState(savedViewLimit) {
    this.set('viewLimit', savedViewLimit);
    this.set('showCopyMessage', true);

    setTimeout(() => {
      if (!this.isDestroyed) {
        this.set('showCopyMessage', false);
      }
    }, 2000);
  }
});
