// @ts-check
{
  const LABEL_FOR_TYPE = {
    [0]: 'Unknown',
    [1]: 'Black-shouldered kite',
    [2]: 'Brown goshawk',
    [3]: 'Collared sparrowhawk',
    [4]: 'Spotted harrier',
    [5]: 'Wedge-tailed eagle',
    [6]: 'Whistling kite',
    [7]: 'Australian wood duck',
    [8]: 'Grey teal',
    [9]: 'Pacific black duck',
    [10]: 'Bush stone-curlew',
    [11]: 'Black-fronted dotterel',
    [12]: 'Oriental plover',
    [13]: 'Great egret',
    [14]: 'Nankeen night heron',
    [15]: 'White-faced heron',
    [16]: 'White-necked heron',
    [17]: 'Black-necked stork',
    [18]: 'Royal spoonbill',
    [19]: 'Straw-necked ibis',
    [20]: 'Common bronzewing',
    [21]: 'Crested pigeon',
    [22]: 'Diamond dove',
    [23]: 'Spinifex pigeon',
    [24]: 'Blue-winged kookaburra',
    [25]: 'Sacred kingfisher',
    [26]: 'Rainbow bee-eater',
    [27]: 'Australasian nankeen kestrel',
    [28]: 'Australian hobby',
    [29]: 'Brown falcon',
    [30]: 'Grey falcon',
    [31]: 'Brown quail',
    [32]: 'Slaty-backed thornbill',
    [33]: 'Weebill',
    [34]: "Horsfield's bush lark",
    [35]: 'Australian magpie',
    [36]: 'Black-faced woodswallow',
    [37]: 'Pied butcherbird',
    [38]: 'Black-faced cuckooshrike',
    [39]: 'White-winged triller',
    [40]: 'Torresian crow',
    [41]: 'Painted finch',
    [42]: 'Zebra finch',
    [43]: 'Tree martin',
    [44]: 'Brown songlark',
    [45]: 'Rufous songlark',
    [46]: 'Spinifexbird',
    [47]: 'Purple-backed fairywren',
    [48]: 'Rufous grasswren',
    [49]: 'Brown honeyeater',
    [50]: 'Crimson chat',
    [51]: 'Grey-headed honeyeater',
    [52]: 'Singing honeyeater',
    [53]: 'White-plumed honeyeater',
    [54]: 'Yellow-throated miner',
    [55]: 'Magpie-lark',
    [56]: 'Australasian pipit',
    [57]: 'Rufous whistler',
    [58]: 'Red-browed pardalote',
    [59]: 'Grey-crowned babbler',
    [60]: 'Western bowerbird',
    [61]: 'Willie wagtail',
    [62]: 'Australasian darter',
    [63]: 'Australian pelican',
    [64]: 'Little black cormorant',
    [65]: 'Little pied cormorant',
    [66]: 'Pied cormorant',
    [67]: 'Hoary-headed grebe',
    [68]: 'Cockatiel',
    [69]: 'Galah',
    [70]: 'Little corella',
    [71]: 'Australian ringneck',
    [72]: 'Budgerigar',
    [73]: 'Little buttonquail',
  };

  const EXTENSION_ID = 'bird-tracker-plugin';

  const LOCAL_CUSTOM_BIRD_TRACKER_VERSION = new Date().getTime();
  // @ts-ignore
  window.CUSTOM_BIRD_TRACKER_VERSION = LOCAL_CUSTOM_BIRD_TRACKER_VERSION;
  /**
   * @param {()=>void} callback
   * @param {number} ms
   */
  const interval = (callback, ms) => {
    // @ts-ignore
    if (window.CUSTOM_BIRD_TRACKER_VERSION != LOCAL_CUSTOM_BIRD_TRACKER_VERSION) return;

    callback();
    setTimeout(() => {
      interval(callback, ms);
    }, ms);
  };

  const storedIdentifications = {
    /**
     * @returns {Record<string, {type: string, identifiedAt?: string}>}
     */
    get: () => {
      const storageValue = localStorage.getItem(EXTENSION_ID);
      if (storageValue == null) return {};
      try {
        const parsed = JSON.parse(storageValue);
        if (typeof parsed != 'object') {
          alert(`Error: invalid local storage [${storageValue}]`);
          return {};
        }
        return parsed;
      } catch (error) {
        alert(`Error: invalid local storage [${storageValue}]`);
        return {};
      }
    },
    /**
     * @param {Record<string, {type: string, identifiedAt?: string}>} identifications
     */
    set: identifications => {
      localStorage.setItem(EXTENSION_ID, JSON.stringify(identifications));
    },
    /**
     * @param {Record<string, {type: string, identifiedAt?: string}>} importedIdentifications
     */
    import: importedIdentifications => {
      const existing = storedIdentifications.get();
      const missmatches = [];

      for (const [id, { type, identifiedAt }] of Object.entries(importedIdentifications)) {
        if (existing[id] && existing[id].type != type) {
          missmatches.push({ id, expected: existing[id].type, got: type });
        }
        if (isNaN(Number(id)) || isNaN(Number(type))) continue;
        existing[id] = { type, identifiedAt };
      }

      if (missmatches.length > 0) {
        const text = missmatches
          .map(
            missmatch =>
              `[track_id=${missmatch.id}]\nexpected [identification_id=${missmatch.expected}]\ngot [identification_id=${missmatch.got}]`,
          )
          .join('\n');
        alert(`Aborting import, found conflicting identification values:\n\n${text}`);
        return;
      }

      storedIdentifications.set(existing);
    },
    /**
     * @param {string} id
     * @param {string} type
     */
    add: (id, type) => {
      const identifications = storedIdentifications.get();
      identifications[id] = { type, identifiedAt: new Date().toISOString() };
      storedIdentifications.set(identifications);
    },
  };

  const csv = {
    /**
     * @param {string} delimiter
     * @param {string[]} columns
     * @param {Record<string, unknown>[]} rows
     */
    serialize: (delimiter, columns, rows) => {
      return (
        columns.join(delimiter) +
        '\n' +
        rows.map(row => columns.map(column => row[column] ?? '').join(delimiter)).join('\n') +
        '\n'
      );
    },
    /**
     * @param {string} delimiter
     * @param {string[]} columns
     * @param {string} raw
     * @return {Record<string, unknown>[]}
     */
    parse: (delimiter, columns, raw) => {
      const rawRows = raw.split('\n');
      const firstRow = rawRows[0]?.split(delimiter) ?? [];

      const mappings = columns.map(column => ({
        name: column,
        index: firstRow.findIndex(rowStr => rowStr == column),
      }));
      if (mappings.some(mapping => mapping.index == -1)) {
        alert(`Error: CSV missing required columns (${columns.join(',')})`);
        return [];
      }

      return rawRows.slice(1).map(rawRow => {
        const rowCols = rawRow.split(',');
        return Object.fromEntries(mappings.map(mapping => [mapping.name, rowCols[mapping.index] ?? undefined]));
      });
    },
    /**
     * @param {string} contents
     */
    download: contents => {
      const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Bird_Identifier_Tracking_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  };

  const container = document.createElement('div');
  container.id = 'custom-bird-tracker';
  container.style = `
    position: fixed;
    right: 20px;
    bottom: 80px;
    width: 240px;

    display: flex;
    flex-direction: column;
    padding: 16px;
    gap: 8px;

    box-shadow: inset rgba(229, 127, 132, 0.53) 1px -3px 20px 3px, rgb(147 147 147 / 53%) 1px -10px 20px 1px;
    border-radius: 4px;
    background: #F4EAE6;
    color: #93040b;
    z-index: 1337;
  `;

  [...document.querySelectorAll(`#${container.id}`)].forEach(container => container.remove());
  document.body.appendChild(container);

  {
    const label = document.createElement('span');
    label.textContent = 'Identifier:';
    container.appendChild(label);
  }

  const identifier = document.createElement('input');
  identifier.id = `${container.id}-identifier`;
  identifier.value = '';
  identifier.disabled = true;
  container.appendChild(identifier);

  {
    const label = document.createElement('span');
    label.textContent = 'Identification:';
    container.appendChild(label);
  }

  const identification = document.createElement('select');
  identification.id = `${container.id}-identification`;
  Object.entries(LABEL_FOR_TYPE).forEach(([type, name]) => {
    const option = document.createElement('option');
    option.textContent = name;
    option.value = type;
    identification.appendChild(option);
  });
  identification.addEventListener('change', () => {
    const id = Number(identifier.value);
    if (isNaN(id)) return;
    updateIdentification.disabled = storedIdentifications.get()[id]?.type == String(identification.selectedIndex);
  });
  container.appendChild(identification);

  const updateIdentification = document.createElement('button');
  updateIdentification.disabled = true;
  updateIdentification.textContent = 'Save Identification';
  updateIdentification.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();

    if (isNaN(Number(identifier.value))) {
      alert(`Error: unexpected non number id (${identifier.value})`);
      return;
    }

    storedIdentifications.add(identifier.value, String(identification.selectedIndex));
    updateIdentification.disabled = true;
  });
  container.appendChild(updateIdentification);

  {
    const hr = document.createElement('hr');
    hr.style = `width: 100%;`;
    container.appendChild(hr);
  }

  {
    const label = document.createElement('span');
    label.textContent = 'Local Identifications:';
    container.appendChild(label);
  }

  const identificationsView = document.createElement('pre');
  identificationsView.style = `
    margin: 0;
    height: 3.5rem;
    background: #fff;
    overflow: scroll;
    padding: 4px;
    border: black 1px;
  `;
  container.appendChild(identificationsView);

  const clearIdentifications = document.createElement('button');
  clearIdentifications.textContent = 'Clear Identifications';
  clearIdentifications.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm('Are you sure? (a backup CSV will be downloaded)')) {
      downloadIdentifications.click();
      storedIdentifications.set({});
    }
  });
  container.appendChild(clearIdentifications);

  const uploadIdentifications = document.createElement('input');
  uploadIdentifications.id = `${container.id}-uploadIdentifications`;
  uploadIdentifications.type = 'file';
  uploadIdentifications.hidden = true;
  uploadIdentifications.accept = '.csv';
  uploadIdentifications.addEventListener('change', e => {
    // @ts-ignore
    const file = e.target?.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      storedIdentifications.import(
        Object.fromEntries(
          csv
            .parse(',', ['track_id', 'identification_id', 'identification_at'], String(event.target?.result ?? ''))
            .filter(row => !isNaN(Number(row.track_id || 'nan')) && !isNaN(Number(row.identification_id || 'nan')))
            .map(row => [row.track_id, { type: row.identification_id, identifiedAt: row.identification_at }]),
        ),
      );
    };
    reader.readAsText(file);
  });
  container.appendChild(uploadIdentifications);

  interval(() => {
    identificationsView.innerText = Object.entries(storedIdentifications.get())
      .sort(([, { identifiedAt: at }], [, { identifiedAt: bt }]) => {
        const ad = new Date(at ?? '').getTime();
        const bd = new Date(bt ?? '').getTime();
        if (isNaN(ad) || isNaN(bd)) {
          return Number(isNaN(ad)) - Number(isNaN(bd));
        }
        return bd - ad;
      })
      .map(([id, { type }]) => `[${id}] ${LABEL_FOR_TYPE[type]}`)
      .join('\n');
  }, 200);

  const uploadIdentificationsButton = document.createElement('button');
  uploadIdentificationsButton.textContent = 'Import Identifications CSV';
  uploadIdentificationsButton.onclick = () => {
    if (confirm('Warning, this will merge your current data with the imported data.')) {
      uploadIdentifications.click();
    }
  };
  container.appendChild(uploadIdentificationsButton);

  const downloadIdentifications = document.createElement('button');
  downloadIdentifications.textContent = 'Download Identifications CSV';
  downloadIdentifications.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();

    csv.download(
      csv.serialize(
        ',',
        ['track_id', 'identification_id', 'identification_name', 'identification_at'],
        Object.entries(storedIdentifications.get()).map(([key, value]) => ({
          track_id: key,
          identification_id: value.type,
          identification_name: LABEL_FOR_TYPE[value.type],
          identification_at: value.identifiedAt,
        })),
      ),
    );
  });
  container.appendChild(downloadIdentifications);

  let idListItem = null;

  interval(() => {
    idListItem = [...document.querySelectorAll('li')].filter(li => li.textContent.startsWith('ID: '))[0];
  }, 200);

  interval(() => {
    const id = idListItem ? Number(idListItem.textContent.replace('ID: ', '').trim()) : 0;

    if (isNaN(id)) {
      alert(`Error: invalid id [${JSON.stringify(id)}]`);
    }

    if (id === 0 || isNaN(id)) {
      identifier.value = '';
      identification.selectedIndex = 0;
      identification.disabled = true;
      updateIdentification.disabled = true;
      return;
    }

    if (identifier.value == String(id)) return;

    identifier.value = String(id);
    identification.disabled = false;

    const storedIdentification = storedIdentifications.get()[id];
    if (!storedIdentification) {
      identification.selectedIndex = 0;
      updateIdentification.disabled = true;
      return;
    }

    const typeNumber = Number(storedIdentification.type);
    if (isNaN(typeNumber)) {
      alert(`Error: stored identification number is NaN (${storedIdentification.type})`);
      return;
    }
    identification.selectedIndex = typeNumber;
  }, 50);
}
