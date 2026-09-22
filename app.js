(function(){
  "use strict";

  var METRICS = [
    {key:'visualizacoes', label:'Visualizações'},
    {key:'compartilhamentos', label:'Compartilhamentos'},
    {key:'alcance', label:'Alcance'},
    {key:'interacoes', label:'Interações'},
    {key:'visualizacoes2', label:'Visualizações (2)'}
  ];
  var TIPO_NAMES = ['Influenciadores','Encartes'];
  var TIPO_DEFAULT_RATES = [
    [0,0,0,0,0],
    [0,0,0,0,0]
  ];
  var INFL_DEFAULT_RATES = [
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0]
  ];
  var ENC_DEFAULT_RATES = [
    [0,0,0,0,0],
    [0,0,0,0,0]
  ];
  var DEFAULT_WEIGHTS = [1,1,1,1,1];
  var DEFAULT_BUDGET = 0;
  var DEFAULT_CAP_TIPOS_MODE = 'pct';
  var DEFAULT_CAP_TIPOS_RAW = 0;
  var DEFAULT_CAP_INFL = 0;
  var DEFAULT_CAP_ENC = 0;

  var fmtMoney = function(n){ return 'R$ ' + (n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var fmtNum = function(n){ return ((n||0)/1000).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}) + ' mil'; };

  var monthKeyToLabel = function(key){
    if(!key) return '';
    var parts = key.split('-'); var y = parts[0], m = parseInt(parts[1],10);
    var meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return meses[m-1] + '/' + y;
  };

  // ---------- armazenamento local (localStorage) — versão para hospedagem estática (GitHub Pages) ----------
  var STORAGE_KEY = 'alocacao_po_meses_v1';
  function readAllLocal(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e){ return {}; } }
  function writeAllLocal(all){ localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); }
  function makeLocalDB(){
    function collection(){
      var orderField = null, orderDir = 'asc', limitN = null;
      var api = {
        doc: function(id){
          return {
            get: function(){
              var all = readAllLocal();
              var exists = Object.prototype.hasOwnProperty.call(all, id);
              return Promise.resolve({ exists: exists, data: exists ? all[id] : null });
            },
            set: function(data){ var all = readAllLocal(); all[id] = data; writeAllLocal(all); return Promise.resolve(); },
            delete: function(){ var all = readAllLocal(); delete all[id]; writeAllLocal(all); return Promise.resolve(); }
          };
        },
        orderBy: function(field, dir){ orderField = field; orderDir = dir || 'asc'; return api; },
        limit: function(n){ limitN = n; return api; },
        get: function(){
          var all = readAllLocal();
          var docs = Object.keys(all).map(function(k){ return { id:k, data: all[k] }; });
          if(orderField){
            docs.sort(function(a,b){
              var av=a.data[orderField], bv=b.data[orderField];
              if(av<bv) return orderDir==='asc' ? -1 : 1;
              if(av>bv) return orderDir==='asc' ? 1 : -1;
              return 0;
            });
          }
          if(limitN) docs = docs.slice(0, limitN);
          return Promise.resolve({ docs: docs });
        }
      };
      return api;
    }
    return { collection: collection };
  }
  var db = makeLocalDB();
  var dbStatusEl = document.getElementById('dbStatus');
  dbStatusEl.textContent = 'dados salvos neste navegador — use Exportar/Importar para compartilhar o histórico';
  refreshMonthList();

  // ---------- exportar / importar histórico (.json) ----------
  document.getElementById('btnExport').addEventListener('click', function(){
    var all = readAllLocal();
    var blob = new Blob([JSON.stringify(all, null, 2)], {type:'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'alocacao-investimento-historico.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  document.getElementById('importFile').addEventListener('change', function(e){
    var file = e.target.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      try{
        var incoming = JSON.parse(ev.target.result);
        var all = readAllLocal();
        Object.keys(incoming).forEach(function(k){ all[k] = incoming[k]; });
        writeAllLocal(all);
        refreshMonthList();
        document.getElementById('saveStatus').textContent = 'histórico importado com sucesso.';
      } catch(err){
        alert('Arquivo inválido. Selecione um .json exportado por este app.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // ---------- build static form ----------
  var weightsGrid = document.getElementById('weightsGrid');
  METRICS.forEach(function(m, i){
    var f = document.createElement('div'); f.className = 'field';
    f.innerHTML = '<label>' + m.label + '</label><input type="number" step="0.1" id="weight-' + i + '">';
    weightsGrid.appendChild(f);
  });

  function buildRateTable(tableEl, names, editableNames, idPrefix){
    var thead = '<thead><tr><th>' + (editableNames ? 'Influenciador' : 'Tipo') + '</th>';
    METRICS.forEach(function(m){ thead += '<th>' + m.label + '</th>'; });
    thead += '</tr></thead>';
    var tbody = '<tbody>';
    names.forEach(function(name, r){
      tbody += '<tr>';
      if(editableNames){
        tbody += '<td><input type="text" id="' + idPrefix + '-name-' + r + '" value="' + name + '"></td>';
      } else {
        tbody += '<td>' + name + '</td>';
      }
      METRICS.forEach(function(m, c){
        tbody += '<td><input type="number" step="1" placeholder="0" id="' + idPrefix + '-' + r + '-' + c + '"></td>';
      });
      tbody += '</tr>';
    });
    tbody += '</tbody>';
    tableEl.innerHTML = thead + tbody;
  }
  buildRateTable(document.getElementById('tiposTable'), TIPO_NAMES, false, 'tipo');

  // ---------- Modelo B / Modelo C: listas dinâmicas (adicionar/remover linhas) ----------
  function escapeAttr(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

  function makeDynamicList(opts){
    var tableEl = document.getElementById(opts.tableId);

    function render(names, ratesMatrix){
      var thead = '<thead><tr><th>' + opts.label + '</th>';
      METRICS.forEach(function(m){ thead += '<th>' + m.label + '</th>'; });
      thead += '<th></th></tr></thead>';
      var tbody = '<tbody>';
      names.forEach(function(name, r){
        var row = ratesMatrix[r] || [];
        tbody += '<tr data-idx="' + r + '">';
        tbody += '<td><input type="text" id="' + opts.idPrefix + '-name-' + r + '" value="' + escapeAttr(name) + '"></td>';
        METRICS.forEach(function(m, c){
          var v = row[c];
          var valueAttr = (v != null && v !== 0) ? (' value="' + v + '"') : '';
          tbody += '<td><input type="number" step="1" placeholder="0"' + valueAttr + ' id="' + opts.idPrefix + '-' + r + '-' + c + '"></td>';
        });
        tbody += '<td><button type="button" class="btn small danger row-del" title="Remover">×</button></td>';
        tbody += '</tr>';
      });
      tbody += '</tbody>';
      tableEl.innerHTML = thead + tbody;
      bindDeletes();
      updateCapMax();
    }

    function currentCount(){ return tableEl.querySelectorAll('tbody tr').length; }

    function readFromDOM(){
      var rows = tableEl.querySelectorAll('tbody tr');
      var names = [], rates = [];
      rows.forEach(function(tr){
        var idx = tr.getAttribute('data-idx');
        var nameEl = document.getElementById(opts.idPrefix + '-name-' + idx);
        names.push((nameEl && nameEl.value) || opts.defaultName(parseInt(idx,10)));
        rates.push(METRICS.map(function(_, c){
          var el = document.getElementById(opts.idPrefix + '-' + idx + '-' + c);
          return el ? (parseFloat(el.value) || 0) : 0;
        }));
      });
      return { names: names, rates: rates };
    }

    function renumber(){
      var rows = tableEl.querySelectorAll('tbody tr');
      rows.forEach(function(tr, idx){
        var oldIdx = tr.getAttribute('data-idx');
        tr.setAttribute('data-idx', idx);
        var nameEl = document.getElementById(opts.idPrefix + '-name-' + oldIdx);
        if(nameEl) nameEl.id = opts.idPrefix + '-name-' + idx;
        METRICS.forEach(function(_, c){
          var el = document.getElementById(opts.idPrefix + '-' + oldIdx + '-' + c);
          if(el) el.id = opts.idPrefix + '-' + idx + '-' + c;
        });
      });
    }

    function updateCapMax(){
      var n = currentCount();
      var capEl = document.getElementById(opts.capId);
      capEl.max = n;
      if((parseInt(capEl.value,10) || 0) > n) capEl.value = n;
    }

    function bindDeletes(){
      tableEl.querySelectorAll('.row-del').forEach(function(btn){
        btn.addEventListener('click', function(){
          var tbody = tableEl.querySelector('tbody');
          if(tbody.children.length <= 1){ alert('É preciso manter pelo menos 1 ' + opts.singular + '.'); return; }
          btn.closest('tr').remove();
          renumber();
          updateCapMax();
          updateCapNotes();
        });
      });
    }

    document.getElementById(opts.addBtnId).addEventListener('click', function(){
      var current = readFromDOM();
      var n = current.names.length;
      current.names.push(opts.defaultName(n));
      current.rates.push([0,0,0,0,0]);
      render(current.names, current.rates);
      updateCapNotes();
    });

    return { render: render, currentCount: currentCount, readFromDOM: readFromDOM };
  }

  var inflList = makeDynamicList({
    tableId: 'inflTable', idPrefix: 'infl', addBtnId: 'btnAddInfl', capId: 'capInfl',
    label: 'Influenciador', singular: 'influenciador',
    defaultName: function(n){ return 'Influenciador ' + String(n+1).padStart(2,'0'); }
  });
  var encList = makeDynamicList({
    tableId: 'encTable', idPrefix: 'enc', addBtnId: 'btnAddEnc', capId: 'capEnc',
    label: 'Encarte', singular: 'encarte',
    defaultName: function(n){ return 'Encarte ' + String(n+1).padStart(2,'0'); }
  });

  inflList.render(
    INFL_DEFAULT_RATES.map(function(_,i){ return 'Influenciador ' + String(i+1).padStart(2,'0'); }),
    INFL_DEFAULT_RATES
  );
  encList.render(
    ENC_DEFAULT_RATES.map(function(_,i){ return 'Encarte ' + String(i+1).padStart(2,'0'); }),
    ENC_DEFAULT_RATES
  );

  // ---------- importar planilha (.xlsx/.csv) ----------
  function findSheetByName(wb, patterns){
    var names = wb.SheetNames;
    for(var p=0;p<patterns.length;p++){
      for(var i=0;i<names.length;i++){
        if(patterns[p].test(names[i])) return wb.Sheets[names[i]];
      }
    }
    return null;
  }
  function parseRatesSheet(ws, maxCols){
    if(!ws) return null;
    var matrix = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
    var headerIdx = -1;
    for(var r=0;r<matrix.length;r++){
      var row = matrix[r] || []; var textCount = 0;
      for(var c=1;c<row.length;c++){ if(typeof row[c]==='string' && row[c].trim()!=='') textCount++; }
      if(textCount>=2){ headerIdx = r; break; }
    }
    if(headerIdx===-1) return null;
    var header = matrix[headerIdx]; var names = [];
    for(var c=1;c<header.length && names.length<maxCols;c++){
      if(header[c]!==undefined && String(header[c]).trim()!==''){ names.push(String(header[c]).trim()); }
    }
    if(!names.length) return null;
    var rates = names.map(function(){ return []; });
    var metricsFound = 0;
    for(var r2=headerIdx+1; r2<matrix.length && metricsFound<5; r2++){
      var row2 = matrix[r2] || []; var hasNum = false;
      for(var c2=1;c2<=names.length;c2++){ if(typeof row2[c2]==='number'){ hasNum = true; break; } }
      if(!hasNum) continue;
      for(var ci=0; ci<names.length; ci++){ var v = row2[ci+1]; rates[ci].push(typeof v==='number' ? v : (parseFloat(v)||0)); }
      metricsFound++;
    }
    if(metricsFound<1) return null;
    return { names: names, rates: rates };
  }
  function findLabelValue(ws, labelRegex){
    if(!ws) return null;
    var matrix = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
    for(var r=0;r<matrix.length;r++){
      var row = matrix[r] || [];
      if(typeof row[0]==='string' && labelRegex.test(row[0])){
        for(var c=1;c<row.length;c++){ if(typeof row[c]==='number') return row[c]; }
      }
    }
    return null;
  }
  document.getElementById('importSheet').addEventListener('change', function(e){
    var file = e.target.files[0];
    var statusEl = document.getElementById('importStatus');
    if(!file) return;
    statusEl.textContent = 'lendo arquivo…'; statusEl.classList.remove('err');
    var reader = new FileReader();
    reader.onload = function(ev){
      try{
        var wb = XLSX.read(new Uint8Array(ev.target.result), {type:'array'});
        var tiposSheet = findSheetByName(wb, [/^dados$/i, /^dados\b/i]);
        var inflSheet = findSheetByName(wb, [/influenc/i]);
        var encSheet = findSheetByName(wb, [/encarte/i]);
        var solverTipos = findSheetByName(wb, [/^solver$/i]);
        var solverInfl = findSheetByName(wb, [/solver.*influenc/i]);
        var found = [];

        var tiposParsed = parseRatesSheet(tiposSheet, 2);
        if(tiposParsed){
          tiposParsed.rates.forEach(function(row,r){
            if(r>=2) return;
            row.forEach(function(v,c){ if(c<5){ var el = document.getElementById('tipo-'+r+'-'+c); if(el) el.value = v; } });
          });
          found.push('Modelo A (' + tiposParsed.names.length + ' tipos)');
        }

        var inflParsed = parseRatesSheet(inflSheet, 200);
        if(inflParsed){
          inflList.render(inflParsed.names, inflParsed.rates);
          found.push('Modelo B (' + inflParsed.names.length + ' influenciadores)');
        }

        var encParsed = parseRatesSheet(encSheet, 200);
        if(encParsed){
          encList.render(encParsed.names, encParsed.rates);
          found.push('Modelo C (' + encParsed.names.length + ' encartes)');
        }

        var budget = findLabelValue(solverTipos, /limite de investimento/i) || findLabelValue(solverInfl, /limite de investimento/i);
        if(budget){ document.getElementById('budget').value = budget; found.push('orçamento'); }

        if(found.length){
          statusEl.textContent = 'importado: ' + found.join(', ') + '.';
          updateCapNotes();
        } else {
          statusEl.textContent = 'não encontrei nenhuma aba com o layout esperado neste arquivo.';
          statusEl.classList.add('err');
        }
      } catch(err){
        statusEl.textContent = 'não foi possível ler este arquivo.';
        statusEl.classList.add('err');
      }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  });

  // ---------- form <-> data ----------
  function defaultMonthData(key){
    return {
      key: key,
      label: monthKeyToLabel(key),
      budget: DEFAULT_BUDGET,
      weights: DEFAULT_WEIGHTS.slice(),
      capTiposMode: DEFAULT_CAP_TIPOS_MODE,
      capTiposRaw: DEFAULT_CAP_TIPOS_RAW,
      capInfl: DEFAULT_CAP_INFL,
      capEnc: DEFAULT_CAP_ENC,
      tiposNomes: TIPO_NAMES.slice(),
      tiposRates: TIPO_DEFAULT_RATES.map(function(r){ return r.slice(); }),
      inflNomes: INFL_DEFAULT_RATES.map(function(_,i){ return 'Influenciador ' + String(i+1).padStart(2,'0'); }),
      inflRates: INFL_DEFAULT_RATES.map(function(r){ return r.slice(); }),
      encNomes: ENC_DEFAULT_RATES.map(function(_,i){ return 'Encarte ' + String(i+1).padStart(2,'0'); }),
      encRates: ENC_DEFAULT_RATES.map(function(r){ return r.slice(); })
    };
  }

  function tiposCapPct(data){
    if(data.capTiposMode === 'valor'){
      return data.budget > 0 ? (data.capTiposRaw / data.budget * 100) : 0;
    }
    if(data.capTiposRaw != null) return data.capTiposRaw;
    return data.capTipos != null ? data.capTipos : 50; // compatibilidade com meses salvos antes desta versão
  }

  function blankIfZero(v){ return (v == null || isNaN(v) || v === 0) ? '' : v; }

  function loadDataIntoForm(data){
    document.getElementById('monthLabel').value = data.label || '';
    document.getElementById('budget').value = blankIfZero(data.budget);
    var mode = data.capTiposMode || 'pct';
    document.getElementById('capTiposMode').value = mode;
    var capTiposRaw = data.capTiposRaw != null ? data.capTiposRaw : (data.capTipos != null ? data.capTipos : 0);
    document.getElementById('capTipos').value = blankIfZero(capTiposRaw);
    updateCapTiposLabel();
    data.weights.forEach(function(w,i){ document.getElementById('weight-'+i).value = w; });
    data.tiposRates.forEach(function(row,r){ row.forEach(function(v,c){ document.getElementById('tipo-'+r+'-'+c).value = blankIfZero(v); }); });
    inflList.render(data.inflNomes, data.inflRates);
    document.getElementById('capInfl').value = data.capInfl ? blankIfZero(Math.round(100/data.capInfl)) : '';
    var encNomes = data.encNomes || ENC_DEFAULT_RATES.map(function(_,i){ return 'Encarte ' + String(i+1).padStart(2,'0'); });
    var encRates = data.encRates || ENC_DEFAULT_RATES;
    encList.render(encNomes, encRates);
    document.getElementById('capEnc').value = data.capEnc ? blankIfZero(Math.round(100/data.capEnc)) : '';
    updateCapNotes();
  }

  function readFormData(key){
    var weights = METRICS.map(function(_,i){ return parseFloat(document.getElementById('weight-'+i).value) || 0; });
    var tiposRates = TIPO_NAMES.map(function(_,r){ return METRICS.map(function(_,c){ return parseFloat(document.getElementById('tipo-'+r+'-'+c).value) || 0; }); });
    var inflData = inflList.readFromDOM();
    var encData = encList.readFromDOM();
    var maxInfl = Math.max(inflList.currentCount(), 1);
    var maxEnc = Math.max(encList.currentCount(), 1);
    return {
      key: key,
      label: document.getElementById('monthLabel').value || monthKeyToLabel(key),
      budget: parseFloat(document.getElementById('budget').value) || 0,
      weights: weights,
      capTiposMode: document.getElementById('capTiposMode').value,
      capTiposRaw: parseFloat(document.getElementById('capTipos').value) || 0,
      capInfl: 100 / Math.min(Math.max(parseInt(document.getElementById('capInfl').value,10) || 5, 1), maxInfl),
      capEnc: 100 / Math.min(Math.max(parseInt(document.getElementById('capEnc').value,10) || 2, 1), maxEnc),
      tiposNomes: TIPO_NAMES.slice(),
      tiposRates: tiposRates,
      inflNomes: inflData.names,
      inflRates: inflData.rates,
      encNomes: encData.names,
      encRates: encData.rates
    };
  }

  function updateCapTiposLabel(){
    var mode = document.getElementById('capTiposMode').value;
    document.getElementById('capTiposValueLabel').textContent = mode === 'valor' ? 'Teto por tipo (R$)' : 'Teto por tipo (%)';
  }
  document.getElementById('capTiposMode').addEventListener('change', function(){
    var budget = parseFloat(document.getElementById('budget').value) || 0;
    var input = document.getElementById('capTipos');
    var current = parseFloat(input.value) || 0;
    var converted;
    if(this.value === 'valor'){
      converted = budget > 0 ? Math.round(budget * current/100) : current; // estava em %, converte para R$
    } else {
      converted = budget > 0 ? Math.round(current / budget * 100) : current; // estava em R$, converte para %
    }
    input.value = blankIfZero(converted);
    updateCapTiposLabel();
    updateCapNotes();
  });

  function currentTiposResult(){
    var weights = METRICS.map(function(_,i){ return parseFloat(document.getElementById('weight-'+i).value) || 0; });
    var tiposRates = TIPO_NAMES.map(function(_,r){ return METRICS.map(function(_,c){ return parseFloat(document.getElementById('tipo-'+r+'-'+c).value) || 0; }); });
    var budget = parseFloat(document.getElementById('budget').value) || 0;
    var mode = document.getElementById('capTiposMode').value;
    var raw = parseFloat(document.getElementById('capTipos').value) || 0;
    var pct = mode === 'valor' ? (budget > 0 ? (raw/budget*100) : 0) : raw;
    return computeAllocation(TIPO_NAMES, tiposRates, weights, budget, pct);
  }

  function updateCapNotes(){
    var budget = parseFloat(document.getElementById('budget').value) || 0;
    var mode = document.getElementById('capTiposMode').value;
    var raw = parseFloat(document.getElementById('capTipos').value) || 0;
    var pctTipos = mode === 'valor' ? (budget > 0 ? (raw/budget*100) : 0) : raw;
    var valTipos = mode === 'valor' ? raw : (budget * raw/100);
    var noteTipos = 'até ' + fmtMoney(valTipos) + ' por tipo (' + pctTipos.toFixed(0) + '% do orçamento)';
    if(pctTipos < 50) noteTipos += ' · abaixo de 50%, com só 2 tipos, pode sobrar orçamento sem alocar.';
    document.getElementById('capTiposNote').textContent = noteTipos;

    var tiposRes = currentTiposResult();

    var nInfl = Math.min(Math.max(parseInt(document.getElementById('capInfl').value,10) || 5, 1), Math.max(inflList.currentCount(),1));
    var inflBudget = tiposRes.alloc[0];
    var valInfl = nInfl > 0 ? inflBudget / nInfl : 0;
    document.getElementById('capInflNote').textContent = 'Os ' + nInfl + ' melhores influenciadores recebem até ' + fmtMoney(valInfl) + ' cada, dividindo a verba de ' + fmtMoney(inflBudget) + ' que o Modelo A destina a "Influenciadores".';

    var nEnc = Math.min(Math.max(parseInt(document.getElementById('capEnc').value,10) || 2, 1), Math.max(encList.currentCount(),1));
    var encBudget = tiposRes.alloc[1];
    var valEnc = nEnc > 0 ? encBudget / nEnc : 0;
    document.getElementById('capEncNote').textContent = 'Os ' + nEnc + ' melhores encartes recebem até ' + fmtMoney(valEnc) + ' cada, dividindo a verba de ' + fmtMoney(encBudget) + ' que o Modelo A destina a "Encartes".';
  }
  ['budget','capTipos','capInfl','capEnc'].forEach(function(id){
    document.getElementById(id).addEventListener('input', updateCapNotes);
  });

  // ---------- optimization (greedy fractional knapsack — optimal for this LP) ----------
  function computeAllocation(names, rates, weights, budget, capPct){
    var n = names.length;
    var cap = budget * (capPct/100);
    var coefs = rates.map(function(row){
      return row.reduce(function(s,v,i){ return s + v * (weights[i]||0); }, 0);
    });
    var order = coefs.map(function(c,i){ return i; }).sort(function(a,b){ return coefs[b]-coefs[a]; });
    var remaining = budget;
    var alloc = new Array(n).fill(0);
    order.forEach(function(idx){
      if(remaining <= 0) return;
      var amt = Math.min(cap, remaining);
      alloc[idx] = amt;
      remaining -= amt;
    });
    var objective = alloc.reduce(function(s,a,i){ return s + a*coefs[i]; }, 0);
    var metricTotals = METRICS.map(function(_,mi){
      return alloc.reduce(function(s,a,i){ return s + a*rates[i][mi]; }, 0);
    });
    return { alloc: alloc, coefs: coefs, objective: objective, metricTotals: metricTotals, unallocated: Math.max(remaining,0) };
  }

  // ---------- results rendering ----------
  function renderResultBlock(containerId, title, names, result, colorClass, subtitle){
    var maxAlloc = Math.max.apply(null, result.alloc.concat([1]));
    var html = '<div class="result-head"><h2>' + title + '</h2><div style="text-align:right"><div class="obj">' + fmtNum(result.objective) + '</div><div class="obj-label">total ponderado</div></div></div>';
    if(subtitle){ html += '<div class="hint" style="margin-top:-6px;margin-bottom:10px;">' + subtitle + '</div>'; }
    if(result.unallocated > 0.5){
      html += '<div class="warn">Teto de diversificação impede alocar ' + fmtMoney(result.unallocated) + ' do orçamento. Aumente o teto ou o número de opções para usar o valor inteiro.</div>';
    }
    names.forEach(function(name, i){
      var w = maxAlloc > 0 ? (result.alloc[i]/maxAlloc*100) : 0;
      html += '<div class="bar-row"><div class="name" title="'+name+'">' + name + '</div><div class="track"><div class="fill ' + (colorClass && i===1 ? 'enc' : '') + '" style="width:' + w + '%"></div></div><div class="val">' + fmtMoney(result.alloc[i]) + '</div></div>';
    });
    html += '<div class="legend">';
    METRICS.forEach(function(m,i){ html += '<span><span class="dot" style="background:var(--accent)"></span>' + m.label + ': ' + fmtNum(result.metricTotals[i]) + '</span>'; });
    html += '</div>';
    document.getElementById(containerId).innerHTML = html;
  }

  function calcAndShow(data){
    var resTipos = computeAllocation(data.tiposNomes, data.tiposRates, data.weights, data.budget, tiposCapPct(data));
    var inflBudget = resTipos.alloc[0]; // verba que o Modelo A destinou ao tipo "Influenciadores"
    var encBudget = resTipos.alloc[1]; // verba que o Modelo A destinou ao tipo "Encartes"
    var resInfl = computeAllocation(data.inflNomes, data.inflRates, data.weights, inflBudget, data.capInfl);
    var resEnc = computeAllocation(data.encNomes, data.encRates, data.weights, encBudget, data.capEnc);
    // O Modelo A exibe a soma real dos totais dos Modelos B e C, em vez de recalcular pela taxa própria da linha do tipo
    resTipos.metricTotals = METRICS.map(function(_, i){ return (resInfl.metricTotals[i] || 0) + (resEnc.metricTotals[i] || 0); });
    resTipos.objective = resInfl.objective + resEnc.objective;
    renderResultBlock('resultTipos', 'Modelo A — Influenciadores × Encartes', data.tiposNomes, resTipos, true,
      'Os totais de métrica e o total ponderado somam os resultados reais dos Modelos B e C.');
    renderResultBlock('resultInfl', 'Modelo B — influenciadores', data.inflNomes, resInfl, false,
      'Divide apenas a verba que o Modelo A destinou a "Influenciadores": ' + fmtMoney(inflBudget) + '.');
    renderResultBlock('resultEnc', 'Modelo C — encartes', data.encNomes, resEnc, false,
      'Divide apenas a verba que o Modelo A destinou a "Encartes": ' + fmtMoney(encBudget) + '.');
    return {tipos: resTipos, infl: resInfl, enc: resEnc};
  }

  // ---------- state / navigation ----------
  var currentKey = null;

  function setMonthKeyInputDefault(){
    var d = new Date();
    var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    document.getElementById('monthKeyInput').value = key;
    return key;
  }
  var initialKey = setMonthKeyInputDefault();

  function activateView(name){
    document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
    document.getElementById('view-' + name).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.view === name); });
    if(name === 'compare') refreshMonthList();
  }
  document.querySelectorAll('.tab-btn').forEach(function(b){
    b.addEventListener('click', function(){ activateView(b.dataset.view); });
  });

  function loadMonth(key){
    currentKey = key;
    document.getElementById('monthKeyInput').value = key;
    document.getElementById('saveStatus').textContent = '';
    if(!db){
      loadDataIntoForm(defaultMonthData(key));
      calcAndShow(defaultMonthData(key));
      return;
    }
    db.collection('meses').doc(key).get().then(function(snap){
      if(snap.exists){
        loadDataIntoForm(snap.data);
        calcAndShow(snap.data);
      } else {
        var base = defaultMonthData(key);
        loadDataIntoForm(base);
        calcAndShow(base);
      }
    }).catch(function(err){
      loadDataIntoForm(defaultMonthData(key));
      document.getElementById('saveStatus').textContent = 'não foi possível consultar o mês salvo: ' + (err && err.code || 'erro');
    });
  }

  document.getElementById('btnLoadMonth').addEventListener('click', function(){
    var key = document.getElementById('monthKeyInput').value;
    if(!key) return;
    loadMonth(key);
    activateView('config');
  });

  document.getElementById('btnCalc').addEventListener('click', function(){
    var data = readFormData(currentKey || document.getElementById('monthKeyInput').value);
    calcAndShow(data);
    activateView('results');
  });

  document.getElementById('btnSave').addEventListener('click', function(){
    var key = document.getElementById('monthKeyInput').value;
    if(!key) return;
    var data = readFormData(key);
    var statusEl = document.getElementById('saveStatus');
    if(!db){ statusEl.textContent = 'armazenamento indisponível — não foi possível salvar.'; statusEl.classList.add('err'); return; }
    statusEl.textContent = 'salvando…'; statusEl.classList.remove('err');
    db.collection('meses').doc(key).set(data).then(function(){
      statusEl.textContent = 'mês salvo com sucesso.';
      currentKey = key;
      calcAndShow(data);
      refreshMonthList();
    }).catch(function(err){
      statusEl.textContent = 'falha ao salvar (' + (err && err.code || 'erro') + ').';
      statusEl.classList.add('err');
    });
  });

  // ---------- comparativo ----------
  var featuredKey = null;
  var lastDocs = [];

  function refreshMonthList(){
    if(!db) return;
    db.collection('meses').orderBy('key','asc').get().then(function(q){
      lastDocs = q.docs;
      if(featuredKey && !q.docs.some(function(d){ return d.data.key === featuredKey; })){
        featuredKey = null;
        document.getElementById('featuredMonthPanel').style.display = 'none';
      }
      renderMonthList(q.docs);
      renderComparativo(q.docs);
    }).catch(function(){});
  }

  function showFeaturedMonth(key, data){
    featuredKey = key;
    var resTipos = computeAllocation(data.tiposNomes, data.tiposRates, data.weights, data.budget, tiposCapPct(data));
    var inflBudget = resTipos.alloc[0], encBudget = resTipos.alloc[1];
    var resInfl = computeAllocation(data.inflNomes, data.inflRates, data.weights, inflBudget, data.capInfl);
    var resEnc = computeAllocation(data.encNomes || [], data.encRates || [], data.weights, encBudget, data.capEnc);
    resTipos.metricTotals = METRICS.map(function(_,i){ return (resInfl.metricTotals[i]||0) + (resEnc.metricTotals[i]||0); });
    resTipos.objective = resInfl.objective + resEnc.objective;
    document.getElementById('featuredMonthPanel').style.display = '';
    document.getElementById('featuredMonthTitle').textContent = 'Mês em destaque: ' + (data.label || key);
    renderResultBlock('featuredTipos', 'Modelo A — Influenciadores × Encartes', data.tiposNomes, resTipos, true);
    renderResultBlock('featuredInfl', 'Modelo B — influenciadores', data.inflNomes, resInfl, false,
      'Verba de "Influenciadores": ' + fmtMoney(inflBudget) + '.');
    renderResultBlock('featuredEnc', 'Modelo C — encartes', data.encNomes || [], resEnc, false,
      'Verba de "Encartes": ' + fmtMoney(encBudget) + '.');
  }

  document.getElementById('btnEditFeatured').addEventListener('click', function(){
    if(!featuredKey) return;
    loadMonth(featuredKey);
    activateView('config');
  });

  function clearFeaturedMonth(){
    featuredKey = null;
    document.getElementById('featuredMonthPanel').style.display = 'none';
    renderMonthList(lastDocs);
    renderComparativo(lastDocs);
  }

  document.getElementById('btnCloseFeatured').addEventListener('click', clearFeaturedMonth);

  document.getElementById('btnDeleteFeatured').addEventListener('click', function(){
    if(!featuredKey) return;
    if(!confirm('Excluir permanentemente o mês ' + featuredKey + '? Essa ação não pode ser desfeita.')) return;
    db.collection('meses').doc(featuredKey).delete().then(function(){
      featuredKey = null;
      document.getElementById('featuredMonthPanel').style.display = 'none';
      refreshMonthList();
    });
  });

  function toggleMonthVisibility(key){
    var doc = lastDocs.filter(function(d){ return d.data.key === key; })[0];
    if(!doc) return;
    var updated = JSON.parse(JSON.stringify(doc.data));
    updated.hiddenFromCompare = !updated.hiddenFromCompare;
    db.collection('meses').doc(key).set(updated).then(refreshMonthList);
  }

  function renderMonthList(docs){
    var el = document.getElementById('monthList');
    if(!docs.length){ el.innerHTML = '<div class="empty">Nenhum mês salvo ainda. Configure e salve um mês para começar o histórico.</div>'; return; }
    var html = '';
    docs.forEach(function(d){
      var hidden = !!d.data.hiddenFromCompare;
      html += '<span class="month-pill' + (d.data.key===featuredKey?' active':'') + (hidden?' dim':'') + '" data-key="' + d.data.key + '">' +
        (d.data.label || d.data.key) +
        '<button class="vis-toggle" data-toggle="' + d.data.key + '" title="' + (hidden ? 'Mostrar no comparativo' : 'Ocultar do comparativo') + '">' + (hidden ? 'exibir' : 'ocultar') + '</button></span>';
    });
    el.innerHTML = html;
    el.querySelectorAll('.month-pill').forEach(function(p){
      p.addEventListener('click', function(e){
        if(e.target.dataset.toggle) return;
        if(p.dataset.key === featuredKey){ clearFeaturedMonth(); return; }
        var doc = lastDocs.filter(function(d){ return d.data.key === p.dataset.key; })[0];
        if(doc) showFeaturedMonth(doc.data.key, doc.data);
        renderMonthList(lastDocs);
      });
    });
    el.querySelectorAll('[data-toggle]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        toggleMonthVisibility(btn.dataset.toggle);
      });
    });
  }

  function svgLineChart(series, labels, colors, height, highlightIdx){
    height = height || 175;
    var width = 640, padL = 36, padR = 10, padT = 22, padB = 22;
    var allVals = [].concat.apply([], series);
    var maxV = Math.max.apply(null, allVals.concat([1])) * 1.15;
    var n = labels.length;
    var stepX = n > 1 ? (width - padL - padR) / (n-1) : 0;
    var x = function(i){ return padL + i*stepX; };
    var y = function(v){ return height - padB - (v/maxV) * (height - padT - padB); };
    var svg = '<svg class="chart" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">';
    // grid
    for(var g=0; g<=3; g++){
      var gy = padT + g*(height-padT-padB)/3;
      svg += '<line x1="'+padL+'" x2="'+(width-padR)+'" y1="'+gy+'" y2="'+gy+'" stroke="var(--line)" stroke-width="1"/>';
    }
    if(highlightIdx != null && highlightIdx >= 0){
      svg += '<line x1="'+x(highlightIdx)+'" x2="'+x(highlightIdx)+'" y1="'+padT+'" y2="'+(height-padB)+'" stroke="var(--ink-dim)" stroke-width="1" stroke-dasharray="3,3"/>';
    }
    var showAllLabels = n <= 6;
    series.forEach(function(s, si){
      var pts = s.map(function(v,i){ return x(i) + ',' + y(v); }).join(' ');
      svg += '<polyline points="' + pts + '" fill="none" stroke="' + colors[si] + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
      s.forEach(function(v,i){
        var r = (highlightIdx === i) ? 5 : 3;
        svg += '<circle cx="'+x(i)+'" cy="'+y(v)+'" r="'+r+'" fill="'+colors[si]+'" ' + (highlightIdx===i ? 'stroke="var(--ink)" stroke-width="1.5"' : '') + '/>';
        if(showAllLabels || i === highlightIdx){
          var ly = Math.max(y(v) - 8, 9);
          svg += '<text x="'+x(i)+'" y="'+ly+'" font-size="8.5" fill="'+colors[si]+'" font-weight="600" font-family="var(--mono)" text-anchor="middle">'+fmtNum(v)+'</text>';
        }
      });
    });
    labels.forEach(function(l,i){
      if(n>8 && i%Math.ceil(n/8)!==0 && i!==n-1 && i!==highlightIdx) return;
      var bold = (i===highlightIdx) ? ' font-weight="600" fill="var(--ink)"' : ' fill="var(--ink-faint)"';
      svg += '<text x="'+x(i)+'" y="'+(height-6)+'" font-size="9"'+bold+' font-family="var(--mono)" text-anchor="middle">'+l+'</text>';
    });
    svg += '</svg>';
    return svg;
  }

  function svgStackedBars(seriesA, seriesB, labels, colorA, colorB, height){
    height = height || 175;
    var width = 640, padL = 8, padR = 8, padT = 16, padB = 22;
    var n = labels.length;
    var maxV = Math.max.apply(null, seriesA.map(function(a,i){ return a + seriesB[i]; }).concat([1])) * 1.1;
    var bw = n > 0 ? Math.min(46, (width-padL-padR)/n - 10) : 20;
    var slot = (width-padL-padR)/Math.max(n,1);
    var svg = '<svg class="chart" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">';
    var fmtLabel = function(v){ return 'R$' + Math.round(v/1000).toLocaleString('pt-BR') + 'mil'; };
    for(var i=0;i<n;i++){
      var cx = padL + slot*i + slot/2;
      var hA = (seriesA[i]/maxV) * (height-padT-padB);
      var hB = (seriesB[i]/maxV) * (height-padT-padB);
      var baseY = height - padB;
      svg += '<rect x="'+(cx-bw/2)+'" y="'+(baseY-hA)+'" width="'+bw+'" height="'+hA+'" fill="'+colorA+'"/>';
      svg += '<rect x="'+(cx-bw/2)+'" y="'+(baseY-hA-hB)+'" width="'+bw+'" height="'+hB+'" fill="'+colorB+'"/>';
      if(hA > 13){
        svg += '<text x="'+cx+'" y="'+(baseY-hA/2+3)+'" font-size="8" fill="var(--accent-ink)" font-family="var(--mono)" text-anchor="middle">'+fmtLabel(seriesA[i])+'</text>';
      }
      if(hB > 13){
        svg += '<text x="'+cx+'" y="'+(baseY-hA-hB/2+3)+'" font-size="8" fill="var(--accent-ink)" font-family="var(--mono)" text-anchor="middle">'+fmtLabel(seriesB[i])+'</text>';
      }
      if(n<=10 || i%Math.ceil(n/10)===0 || i===n-1){
        svg += '<text x="'+cx+'" y="'+(height-6)+'" font-size="9" fill="var(--ink-faint)" font-family="var(--mono)" text-anchor="middle">'+labels[i]+'</text>';
      }
    }
    svg += '</svg>';
    return svg;
  }

  function historyTable(title, docs, labels, getNomesRates, getRTAlloc, fieldCap, highlightIdx){
    var perDoc = docs.map(function(d){
      var data = d.data;
      var rT = computeAllocation(data.tiposNomes, data.tiposRates, data.weights, data.budget, tiposCapPct(data));
      var nr = getNomesRates(data);
      var r = computeAllocation(nr.names, nr.rates, data.weights, getRTAlloc(rT), data[fieldCap]);
      var byName = {};
      nr.names.forEach(function(n, idx){ byName[n] = r.alloc[idx] || 0; });
      return { byName: byName, objective: r.objective };
    });
    var allNames = [];
    docs.forEach(function(d){ getNomesRates(d.data).names.forEach(function(n){ if(allNames.indexOf(n) === -1) allNames.push(n); }); });
    var html = '<h2>' + title + '</h2><div class="scrollx"><table class="grid"><thead><tr><th></th>';
    labels.forEach(function(l, i){ html += '<th' + (i===highlightIdx ? ' style="color:var(--accent);"' : '') + '>' + l + '</th>'; });
    html += '</tr></thead><tbody>';
    allNames.forEach(function(name){
      html += '<tr><td>' + name + '</td>';
      perDoc.forEach(function(d, i){
        html += '<td' + (i===highlightIdx ? ' style="background:var(--panel-alt);"' : '') + '>' + (name in d.byName ? fmtMoney(d.byName[name]) : '—') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return { html: html, objectives: perDoc.map(function(d){ return d.objective; }) };
  }

  function renderComparativo(docs){
    var objEl = document.getElementById('compareObjective');
    var tiposEl = document.getElementById('compareTipos');
    var inflEl = document.getElementById('compareInfl');
    var encEl = document.getElementById('compareEnc');
    var visibleDocs = docs.filter(function(d){ return !d.data.hiddenFromCompare; });
    if(!visibleDocs.length){
      var msg = docs.length
        ? 'Todos os meses estão ocultos do comparativo. Toque em "exibir" ao lado de um mês na lista acima para incluí-lo.'
        : 'Nenhum mês salvo ainda.';
      objEl.innerHTML = '<div class="empty">' + msg + '</div>'; tiposEl.innerHTML = ''; inflEl.innerHTML = ''; encEl.innerHTML = '';
      return;
    }
    var labels = visibleDocs.map(function(d){ return d.data.label || d.data.key; });
    var highlightIdx = -1;
    visibleDocs.forEach(function(d, i){ if(d.data.key === featuredKey) highlightIdx = i; });
    var objTipos = [], allocTipos0 = [], allocTipos1 = [];
    visibleDocs.forEach(function(d){
      var data = d.data;
      var rT = computeAllocation(data.tiposNomes, data.tiposRates, data.weights, data.budget, tiposCapPct(data));
      objTipos.push(rT.objective);
      allocTipos0.push(rT.alloc[0]); allocTipos1.push(rT.alloc[1]);
    });

    var inflHist = historyTable('Alocação por influenciador — histórico', visibleDocs, labels,
      function(data){ return { names: data.inflNomes, rates: data.inflRates }; },
      function(rT){ return rT.alloc[0]; }, 'capInfl', highlightIdx);
    var encHist = historyTable('Alocação por encarte — histórico', visibleDocs, labels,
      function(data){ return { names: data.encNomes || [], rates: data.encRates || []}; },
      function(rT){ return rT.alloc[1]; }, 'capEnc', highlightIdx);

    objEl.innerHTML = '<h2>Resultado ponderado por mês</h2><div class="hint">Comparação entre os três modelos de alocação (meses ocultos não entram aqui).</div>' +
      svgLineChart([objTipos, inflHist.objectives, encHist.objectives], labels, ['#2fa88f','#d9a72e','#8a7fd6'], null, highlightIdx) +
      '<div class="legend"><span><span class="dot" style="background:#2fa88f"></span>Modelo A (tipos)</span><span><span class="dot" style="background:#d9a72e"></span>Modelo B (influenciadores)</span><span><span class="dot" style="background:#8a7fd6"></span>Modelo C (encartes)</span></div>';

    tiposEl.innerHTML = '<h2>Divisão do orçamento — Influenciadores × Encartes</h2>' +
      svgStackedBars(allocTipos0, allocTipos1, labels, '#2fa88f', '#d9a72e') +
      '<div class="legend"><span><span class="dot" style="background:#2fa88f"></span>Influenciadores</span><span><span class="dot" style="background:#d9a72e"></span>Encartes</span></div>';

    inflEl.innerHTML = inflHist.html;
    encEl.innerHTML = encHist.html;
  }

  // ---------- boot ----------
  loadDataIntoForm(defaultMonthData(initialKey));
  calcAndShow(defaultMonthData(initialKey));
})();
