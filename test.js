var FacturePaiementUtils = function() {
  this.blocErreurContratResilie =
    '<div class="col-1"><figure><span class="sprite-3 picto-engie-contrat-resil"></span></figure><p class="no-margin contrat-type">Contrat rÃ©siliÃ©</p><div class="clearfix"></div></div>'
  this.blocErreurLocalisee =
    '<div><p class="text-center" style="font-weight: bold;"><img src="/content/dam/images/pictos/picto-attention-bleu-45.png"><br> Oups, vos donnÃ©es sont<br> momentanÃ©ment indisponibles</p> </div>'
  this.blocErreurAucunPaiement =
    '<div><p class="text-center" style="font-weight: bold;"><img src="/content/dam/images/pictos/picto-attention-bleu-45.png"><br> Vous \'avez pas encore de paiement</p> </div>'
  this.blocLoading =
    '<div><p class="text-center" style="font-weight: 500; font-size: 14px; line-height: 30px;"><img src="/etc/designs/cel/images/loader2.gif"><br> Chargement en cours...</p> </div>'
  this.isMobileNav = false
  this.is2DDoc = false
  FacturePaiementUtils.prototype.telechargerFacture = function(h) {
    this.afficherPopinEspritService()
    var c = new Date(h.dateFacture)
    var i = c.getDate()
    var f = c.getMonth()
    var d = c.getFullYear()
    var g = ('0' + i).slice(-2) + '' + ('0' + (f + 1)).slice(-2) + '' + d
    var a = g + '-NÂ°' + h.id + '.pdf'
    var k = '_blank'
    var j =
      'dependent=yes,locationbar=no,scrollbars=yes,menubar=yes,resizable,screenX=50,screenY=50,width=850,height=1050'
    var l = encodeURIComponent(h.url)
    var b = '/cel-ws/api/private/document/mobile/' + l + '/SAE/' + a
    var e = window.open(b, k, j)
  }
  FacturePaiementUtils.prototype.afficherPopinEspritService = function() {
    var d = CompteEnLigne.getInstance()
    var c = d.getCurrentCC()
    var b = function() {
      if (c.isServiceActif('FEL')) {
        $('body').append(
          '<div id="esPopinAvisServiceFac" class="es_popin"></div>'
        )
        depotAvisServiceV2(
          'esPopinAvisServiceFac',
          'FEL',
          d.refBP,
          d.nom,
          d.prenom,
          d.email
        )
      }
    }
    if (c.isServiceActif('FEL') !== null) {
      b()
    } else {
      var a = new FactureEtPaiementsController()
      a.requestListeService()
      factoryUtils.listenEvent(dataFactory.config.DF_EVENT_SERVICES_LOADED, b)
    }
  }
  FacturePaiementUtils.prototype.render = function(b, a) {
    var c = false
    if (!$(b)) {
      return false
    }
    $currentEl = $(b)
    if ($currentEl.hasClass('defaultHiddenMob')) {
      c = true
    }
    if (b && a) {
      $currentEl.html(a)
    }
    if ($currentEl.is('div') && c) {
      $currentEl.addClass('isActive')
    }
    if (!(c && $(window).width() < 768)) {
      $currentEl.show()
    }
  }
  FacturePaiementUtils.prototype.renderLink = function(b, a) {
    if (b && a && $(b)) {
      if ($(b)[0] && $(b)[0].tagName === 'A') {
        $(b).attr('href', a)
      } else {
        $(b)
          .find('a')
          .attr('href', a)
      }
      $(b).show()
    } else {
      if ($(b)) {
        $(b).show()
      }
    }
  }
  FacturePaiementUtils.prototype.clean = function(a) {
    if (a && $(a)) {
      if ($(a)[0] && $(a)[0].tagName === 'A') {
        $(a).attr('href', '#')
      } else {
        $(a).html('')
      }
      $(a).hide()
    }
  }
  FacturePaiementUtils.prototype.cleanLink = function(a) {
    if (a && $(a)) {
      if ($(a)[0] && $(a)[0].tagName === 'A') {
        $(a).attr('href', '#')
      } else {
        $(a)
          .find('a')
          .attr('href', '#')
      }
      $(a).hide()
    }
  }
  FacturePaiementUtils.prototype.style = function(a, b) {
    if (a && $(a)) {
      $(a).css(b)
    }
  }
  FacturePaiementUtils.prototype.hide = function(a) {
    if ($(a)) {
      $(a).hide()
      $(a).removeClass('isActive')
    }
  }
  FacturePaiementUtils.prototype.mask = function(a) {
    if ($(a)) {
      $(a).css({ visibility: 'hidden' })
    }
  }
  FacturePaiementUtils.prototype.unmask = function(a) {
    if ($(a)) {
      $(a).css({ visibility: 'visible' })
    }
  }
  FacturePaiementUtils.prototype.clone = function(a) {
    return jQuery.extend(true, {}, a)
  }
  FacturePaiementUtils.prototype.cloneSansRejet = function(a) {
    var b = {}
    if (a != null) {
      for (field in a) {
        if (!a[field].statutPaiement || a[field].statutPaiement.code !== 'R') {
          b[field] = jQuery.extend(true, {}, a[field])
        }
      }
    }
    return b
  }
  FacturePaiementUtils.prototype.clonePaiementsCE = function(a) {
    var b = {}
    if (a != null) {
      for (field in a) {
        if (a[field].modePaiement === 'CE') {
          b[field] = jQuery.extend(true, {}, a[field])
        }
      }
    }
    return b
  }
  FacturePaiementUtils.prototype.downloadDocumentMP = function(c, a) {
    var d = encodeURIComponent(c)
    var b = '/cel-ws/api/private/document/mobile/' + d + '/SAE/' + a
    window.open(b, '_blank')
  }
  FacturePaiementUtils.prototype.downloadDocument = function(c, a) {
    var d = encodeURIComponent(c)
    var b = '/cel-ws/api/private/document/mobile/' + d + '/SAE/' + a
    window.open(b, '_blank')
  }
  FacturePaiementUtils.prototype.getContribution = function(a) {
    if ($(a)) {
      return $(a).html()
    }
  }
  FacturePaiementUtils.prototype.toggleOnMobile = function(b) {
    var a = b.closest('.isToggleBlock')
    a.toggleClass('open')
    a.find('.isActive').toggle()
  }
}
var facturePaiementUtils = new FacturePaiementUtils()
$(document).ready(function() {
  $('.table tr').click(function(a) {
    a.stopPropagation()
  })
  if ($.trim($('#hid_erreurContratResilie').html()).length) {
    facturePaiementUtils.blocErreurContratResilie = $(
      '#hid_erreurContratResilie'
    ).html()
  }
  if ($.trim($('#hid_erreurLocalisee').html()).length) {
    facturePaiementUtils.blocErreurLocalisee = $('#hid_erreurLocalisee').html()
  }
  if ($.trim($('#activation2DDoc').text()).length) {
    facturePaiementUtils.is2DDoc =
      !_.isEmpty($('#activation2DDoc').text()) &&
      $('#activation2DDoc').text() === 'ON'
        ? true
        : false
  }
  if ($.trim($('#hid_blocLoading').html()).length) {
    facturePaiementUtils.blocLoading = $('#hid_blocLoading').html()
  }
  if ($(window).width() < 768) {
    FacturePaiementUtils.isMobileNav = true
  }
})

function tmsTelechargerAttestationTitulaireElec(a) {
  return F_00_09_marqueClic(
    a.currentTarget,
    'apps.justificatif_domicile.telecharger_attestation_domicile_elec',
    {
      tc_clic_name: 'telecharger_attestation_domicile_elec',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'pdf'
    }
  )
}

function tmsTelechargerAttestationTitulaireGaz(a) {
  return F_00_09_marqueClic(
    a.currentTarget,
    'apps.justificatif_domicile.telecharger_attestation_domicile_gaz',
    {
      tc_clic_name: 'telecharger_attestation_domicile_gaz',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'pdf'
    }
  )
}

function tmsTelechargerAttestationFicheRenseignement(a) {
  return F_00_09_marqueClic(
    a.currentTarget,
    'apps.justificatif_domicile.telecharger_fiche_renseignement',
    {
      tc_clic_name: 'telecharger_fiche_renseignement',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'pdf'
    }
  )
}

function tmsTelechargerAttestationTitulaireDual(a) {
  return F_00_09_marqueClic(
    a.currentTarget,
    'apps.bloc_justificatif_domicile.telecharger_attestation_titulaire_dual',
    {
      tc_clic_name: 'telecharger_attestation_titulaire_dual',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'lien',
      tc_clic_type: 'pdf'
    }
  )
}

function tmsAppDerniereFacture_telechargerVotreFacture(a) {
  F_00_09_marqueClic(
    a.currentTarget,
    'apps.derniere_facture.telecharger_votre_facture',
    {
      tc_clic_name: 'telecharger_votre_facture',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'pdf'
    }
  )
}

function tmsAppDerniereFacture_comprendreVotreFacture(a) {
  return F_00_09_marqueClic(
    a.currentTarget,
    'apps.derniere_facture.comprendre_votre_facture',
    {
      tc_clic_name: 'comprendre_votre_facture',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'lien'
    }
  )
}

function tmsAppDerniereFacture_detailsSurVotreFacture(a) {
  return F_00_09_marqueClic(
    a.currentTarget,
    'apps.derniere_facture.details_sur_votre_facture',
    {
      tc_clic_name: 'details_sur_votre_facture',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'lien'
    }
  )
}

function tmsAppDerniereFacture_lienPayerVotreFacture(a) {
  F_00_09_marqueClic(
    a.currentTarget,
    'apps.derniere_facture.payer_votre_facture',
    {
      tc_clic_name: 'payer_votre_facture',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'lien'
    }
  )
}

function tmsAppListeFactures_telechargerVotreFacture(a) {
  F_00_09_marqueClic(
    a.currentTarget,
    'apps.liste_factures.telecharger_votre_facture',
    {
      tc_clic_name: 'telecharger_votre_facture',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'pdf'
    }
  )
}

function tmsAppListeFactures_voirLesPrecedentesFactures(a) {
  F_00_09_marqueClic(
    a.currentTarget,
    'apps.liste_factures.voir_les_precedentes_factures',
    {
      tc_clic_name: '.voir_les_precedentes_factures',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'lien'
    }
  )
}

function tmsAppListeFactures_lienTelechargerToutesVosFactures(a) {
  F_00_09_marqueClic(
    a.currentTarget,
    'apps.liste_factures.telecharger_toutes_vos_factures',
    {
      tc_clic_name: 'telecharger_toutes_vos_factures',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'pdf'
    }
  )
}

function tmsAppDernierPaiement_commencerActivationMens(a) {
  if (isImpersonationMode()) {
    return false
  }
  ;('use strict')
  return F_00_09_marqueClic(
    a.currentTarget,
    'apps.dernier_paiement.commencer_activation_mens',
    {
      tc_clic_name: 'commencer_activation_mens',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'lien'
    }
  )
}

function tmsAppDernierPaiement_telechargerPlanMens(a) {
  F_00_09_marqueClic(
    a.currentTarget,
    'apps.dernier_paiement.telecharger_plan_de_mensualisation',
    {
      tc_clic_name: 'telecharger_plan_de_mensualisation',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'pdf'
    }
  )
}

function tmsAppDernierPaiement_telechargerPlanApurement(a) {
  F_00_09_marqueClic(
    a.currentTarget,
    'apps.dernier_paiement.telecharger_plan_apurement',
    {
      tc_clic_name: 'telecharger_plan_apurement',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'pdf'
    }
  )
}

function tmsAppProchainsPaiements_voirLesProchainsPaiements(a) {
  F_00_09_marqueClic(
    a.currentTarget,
    'apps.liste_prochains_paiements.voir_les_prochains_paiements',
    {
      tc_clic_name: 'voir_les_prochains_paiements',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'lien'
    }
  )
}

function tmsAppListePrecedentsPaiements_voirLesPrecedentsPaiements(a) {
  F_00_09_marqueClic(
    a.currentTarget,
    'apps.liste_precedents_paiements.voir_les_precedents_paiements',
    {
      tc_clic_name: 'voir_les_precedents_paiements',
      tc_clic_zone: 'milieu_de_page',
      tc_event_type: 'lien'
    }
  )
}

function tmsAppChequeEnergieListePaiements_affichagePush() {
  $(window).on('load', function() {
    tc_events_push(
      $('#bloc_chequeEnergie_paiements'),
      'apps.push.service.cheque_energie',
      { tc_clic_type: 'push_view_component' }
    )
  })
}

function tmsAppChequeEnergieListePaiements_afficherLesPaiements(a) {
  F_00_09_marqueClic(a.currentTarget, 'apps.push.service.cheque_energie', {
    tc_clic_type: 'push_clic_component',
    tc_clic_name: 'consulter_plus_de_details'
  })
}

function tmsAppChequeEnergieListePaiements_effectuerLaPreaffectation(a) {
  F_00_09_marqueClic(a.currentTarget, 'apps.push.service.cheque_energie', {
    tc_clic_type: 'push_clic_component',
    tc_clic_name: 'sortie_vers_asp'
  })
}

var DerniereFacture = function() {
  var B = null
  var a = null
  var e = false
  var s = false
  var c = '#DerniereFacture_content'
  var F = '#DerniereFacture_error'
  var r = '#DerniereFacture_date'
  var g = '#DerniereFacture_montant'
  var f = '#DerniereFacture_date_echeance'
  var n = '#DerniereFacture_date_echeance_depasse'
  var L = '#DerniereFacture_telecharger'
  var i = '#DerniereFacture_plus_de_detail'
  var G = '#DerniereFacture_mentions_legales'
  var u = '#DerniereFacture_bloc_regler_avant'
  var I = '#DerniereFacture_bloc_regler_depuis'
  var l = '#DerniereFacture_payer_en_ligne'
  var v = '#DerniereFacture_statut_paiement'
  var p = '#DerniereFacture_date_prochaine_facture'
  var C = '#DerniereFacture_bloc_date_prochaine_facture'
  var w = '#lien-comprendre-facture-normale'
  var A = '#lien-facture-animee'
  var x =
      '<p>DÃ©solÃ©<br>Vous nâ€™avez pas encore de facture sur ce logement.</p>',
    d = 'Facture bientÃ´t disponible'
  var y = function() {
    z()
    H()
    if (B && a) {
      facturePaiementUtils.render(r, convertTimestampToDate(a.dateFacture, 2))
      facturePaiementUtils.render(g, a.getMontantFormate())
      if (B.estRole3() || !a.url) {
        q(L)
      } else {
        D(L)
      }
      if (B.dateProchaineFacture) {
        facturePaiementUtils.render(p, t())
        facturePaiementUtils.render(C)
      } else {
        facturePaiementUtils.hide(C)
      }
      if (B.isMensualise) {
        if ($('#linkMoreDetail').attr('href') != '') {
          facturePaiementUtils.render(i)
          facturePaiementUtils.hide(u)
          facturePaiementUtils.hide(I)
        }
      } else {
        if (
          !B.isModeEncaissementPrelevement &&
          a.montant >= 0 &&
          a.statutPaiement === 'Non'
        ) {
          if (new Date() <= a.dateEcheance) {
            facturePaiementUtils.render(
              f,
              convertTimestampToDate(a.dateEcheance, 1)
            )
            facturePaiementUtils.render(u)
          } else {
            facturePaiementUtils.render(
              n,
              convertTimestampToDate(a.dateEcheance, 1)
            )
            facturePaiementUtils.render(I)
          }
        } else {
          facturePaiementUtils.hide(u)
          facturePaiementUtils.hide(I)
        }
        facturePaiementUtils.hide(i)
      }
      var N = false
      var M = ''
      if (
        (parseFloat(B.soldeEnCours) > 0 && !B.isModeEncaissementPrelevement) ||
        (a.modePaiement === 'P' &&
          a.statutPaiement === 'Non' &&
          new Date() >= a.dateEcheance &&
          parseFloat(B.soldeEnCours) > 0)
      ) {
        facturePaiementUtils.render(l)
        N = true
      } else {
        facturePaiementUtils.hide(l)
      }
      if (a.statutPaiement === 'Oui') {
        if (B.isModeEncaissementPrelevement) {
          M = a.montant >= 0 ? 'RÃ©glÃ©e' : 'RemboursÃ©'
        } else {
          M = 'RÃ©glÃ©e'
        }
        facturePaiementUtils.render(v, M)
      } else {
        if (B.isModeEncaissementPrelevement && !N) {
          M = 'En cours'
          if (a.montant >= 0) {
            if (a.dateEcheance && a.dateEcheance > new Date()) {
              m()
              M =
                'PrÃ©lÃ¨vement le ' + convertTimestampToDate(a.dateEcheance, 4)
            } else {
              M += '*'
              facturePaiementUtils.unmask(G)
            }
          }
          facturePaiementUtils.render(v, M)
        } else {
          if (a.montant >= 0 && !N) {
            if (a.statutPaiement === 'Oui') {
              facturePaiementUtils.render(v, 'RÃ©glÃ©e')
            } else {
              if (parseFloat(B.soldeEnCours) >= a.montant) {
                facturePaiementUtils.render(l)
              } else {
                if (parseFloat(B.soldeEnCours) === 0) {
                  facturePaiementUtils.render(v, 'Paiement en cours')
                }
              }
            }
          } else {
            if (!N) {
              facturePaiementUtils.render(v, 'En cours')
            }
          }
        }
      }
      facturePaiementUtils.render(c)
      facturePaiementUtils.hide(F)
      b()
    } else {
      facturePaiementUtils.hide(c)
      facturePaiementUtils.render(F, x)
    }
  }
  var h = function() {
    if (e && s) {
      if (
        !AB.mediaQuery.is('smallOnly') &&
        StaticCompteClient.estUneFactureDeRegularisation(a) &&
        a.url
      ) {
        _CN(w).addClass('hidden')
        _CN(A).removeClass('hidden')
      } else {
        _CN(A).addClass('hidden')
        _CN(w).removeClass('hidden')
      }
    }
  }
  var t = function() {
    if (B.dateProchaineFacture) {
      var M = B.dateProchaineFacture
      M += 24 * 3 * 3600 * 1000
      return convertTimestampToDate(M, 2)
    }
  }
  var o = function() {
    z()
    facturePaiementUtils.render(F, facturePaiementUtils.blocErreurLocalisee)
  }
  var K = function() {
    z()
    e = false
    s = false
    facturePaiementUtils.render(F, facturePaiementUtils.blocLoading)
  }
  var q = function(M) {
    $(L).addClass('btn-white btn-notAllowed')
    $(L).attr(
      'style',
      'width:inherit;max-width:200px;padding-left: 5px !important;padding-right: 5px !important;'
    )
    var N =
      "<div class='hide-desktop hide-mobile show-tablette' style='width: 150px;margin-left: -5px;margin-right: -5px;'>Facture bientÃ´t dispo</div><div class='hide-desktop show-mobile hide-tablette'>" +
      d +
      "</div><div class='show-desktop hide-mobile' style='padding-right: 10px; padding-left: 10px;'>" +
      d +
      '</div>'
    $(L).html(N)
  }
  var D = function(M) {
    $(L).removeClass('btn-white btn-notAllowed')
    $(L).attr('style', '')
    $(L).html('<span></span>TÃ©lÃ©charger')
  }
  var b = function() {
    $(L)
      .unbind()
      .click(function(M) {
        if (!B.estRole3() && a && a.url) {
          tmsAppDerniereFacture_telechargerVotreFacture(M)
          facturePaiementUtils.telechargerFacture(a)
        }
      })
    $(l)
      .unbind()
      .click(function(M) {
        if (isImpersonationMode()) {
          return false
        }
        tmsAppDerniereFacture_lienPayerVotreFacture(M)
      })
  }
  var m = function() {
    var N = function() {
      var P = window,
        S = document,
        R = S.documentElement,
        Q = S.getElementsByTagName('body')[0],
        O = P.innerWidth || R.clientWidth || Q.clientWidth
      return O
    }
    var M = function() {
      var O = N()
      if (O > 760 && O < 992) {
        $(v).css('font-size', '12px')
        $(L).css('font-size', '12px')
        $(v).css('line-height', '20px')
      } else {
        $(v).css('font-size', '14px')
        $(L).css('font-size', '14px')
        $(v).css('line-height', '40px')
      }
    }
    $(window).resize(function() {
      M()
    })
    M()
  }
  var J = function() {
    facturePaiementUtils.render(
      F,
      facturePaiementUtils.blocErreurContratResilie
    )
  }
  var z = function() {
    B = null
    a = null
    facturePaiementUtils.clean(r)
    facturePaiementUtils.clean(g)
    facturePaiementUtils.clean(v)
    facturePaiementUtils.clean(p)
    facturePaiementUtils.clean(f)
    facturePaiementUtils.clean(F)
    facturePaiementUtils.mask(G)
    facturePaiementUtils.hide(C)
    facturePaiementUtils.hide(l)
    facturePaiementUtils.hide(i)
    facturePaiementUtils.hide(u)
    facturePaiementUtils.hide(c)
    D(L)
  }
  var H = function() {
    B = CompteEnLigne.getInstance().getCurrentCC()
    if (B) {
      a = B.getDerniereFacture()
    }
  }
  var E = function() {
    e = true
    y()
    h()
  }
  var k = function() {
    s = true
    h()
  }
  var j = function() {
    s = true
    h()
  }
  DerniereFacture.prototype.init = function() {
    if ($.trim($('#hid_erreurFactureIndispo').html()).length) {
      x = $('#hid_erreurFactureIndispo').html()
    }
    if ($.trim($('#hid_messageFactureIndispo').html()).length) {
      d = $('#hid_messageFactureIndispo').html()
    }
    K()
    H()
    if (B && a) {
      y()
    }
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_FACTURES_LOADED, E)
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_FACTURES_ERROR, o)
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_MENSUALISATIONS_LOADED,
      k
    )
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_MENSUALISATIONS_ERROR,
      j
    )
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_CHANGECOMPTECONTRATS,
      K
    )
  }
}
$(document).ready(function() {
  var a = new DerniereFacture()
  a.init()
})
var ListeFacture = function() {
  var A = null
  var h = []
  var s = {}
  var i = []
  var e = '#ListeFacture_content'
  var C = '#ListeFacture_error'
  var a = '#ListeFacture_table'
  var l = '#ListeFacture_table_body'
  var b = '#ListeFacture_show_previous_factures'
  var z = 'ListeFacture_facture_'
  var f =
    '<thead><tr><th scope="col">AnnÃ©e</th><th scope="col" style="cursor: pointer;" id="fact-sort-date">Date<span class="sprite-select fleche-bas"></span></th><th scope="col" style="cursor: pointer;" id="fact-sort-montant">Montant<span class="sprite-select fleche-bas"></span></th><th scope="col" style="cursor: pointer;" id="fact-sort-etat">Etat<span class="sprite-select fleche-bas"></span></th><th scope="col">TÃ©lÃ©charger</th></tr></thead>'
  var o =
    '<div><p class="text-center" style="font-weight: bold;"><img src="/content/dam/images/pictos/picto-attention-bleu-45.png"><br> Vous nâ€™avez pas de factures prÃ©cÃ©dentes.</p> </div>'
  var I =
    '<div><p class="text-center" style="font-weight: bold;"><img src="/content/dam/images/pictos/picto-attention-bleu-45.png"><br> Vous nâ€™avez pas encore de facture sur ce Contrat.</p> </div>'
  var J = 'Non disponible'
  var d = false
  var x = function() {
    y()
    E()
    if (A && nbElement(A.factures) > 1) {
      facturePaiementUtils.render(a, w())
      if (!g()) {
        facturePaiementUtils.hide(b)
      }
      facturePaiementUtils.render(e)
      facturePaiementUtils.hide(C)
      m()
    } else {
      if (A && nbElement(A.factures) == 1) {
        facturePaiementUtils.hide(e)
        facturePaiementUtils.render(C, o)
      } else {
        facturePaiementUtils.hide(e)
        facturePaiementUtils.render(C, I)
      }
    }
  }
  var r = function() {
    y()
    facturePaiementUtils.render(C, facturePaiementUtils.blocErreurLocalisee)
  }
  var m = function() {
    $('a.show-factures')
      .unbind()
      .click(function(K) {
        B(this)
        K.stopPropagation()
        return false
      })
    $('.display-all-facture')
      .unbind()
      .click(function(K) {
        tmsAppListeFactures_voirLesPrecedentesFactures(K)
        $(this)
          .find('span')
          .toggleClass('hide')
        $('.row-empty .lien-factures').each(function() {
          if (
            !$(this)
              .parents('tr.parent.row-empty')
              .hasClass('current')
          ) {
            var L = $(this).html()
            if (
              $(this)
                .parents('tr.parent.row-empty')
                .hasClass('hide')
            ) {
              $('tr.facture-annee-' + L)
                .removeClass('hide')
                .addClass('show')
            } else {
              $('tr.facture-annee-' + L)
                .removeClass('show')
                .addClass('hide')
            }
          }
        })
        $.each(i, function(M, L) {
          if ($('.first-row-child.facture-annee-' + L).is(':visible')) {
            if (
              $('tr.line-table-after-3.facture-annee-' + L).hasClass('hide') &&
              $('.display-all-facture').hasClass('show-other-factures')
            ) {
              $('tr.line-table-after-3.facture-annee-' + L)
                .removeClass('hide')
                .addClass('show')
            }
            if (
              !$('tr.line-table-after-3.facture-annee-' + L).hasClass('hide') &&
              $('.display-all-facture').hasClass('mask-other-factures')
            ) {
              $('tr.line-table-after-3.facture-annee-' + L)
                .removeClass('show')
                .addClass('hide')
            }
          }
        })
        if ($('.display-all-facture').hasClass('show-other-factures')) {
          $('.display-all-facture')
            .removeClass('show-other-factures')
            .addClass('mask-other-factures')
          $.each($('.fp-sprite-chevron-bleu-left'), function(L, M) {
            if (
              $(M)
                .parent()
                .parent()
                .parent()
                .hasClass('first-row-child')
            ) {
              $(M)
                .removeClass('fp-sprite-chevron-bleu-left')
                .addClass('fp-sprite-chevron-bleu-bottom')
            }
          })
          $.each($('a.show-factures'), function(M, N) {
            var L = $(N).text()
            if (
              $(N)
                .parent()
                .parent()
                .parent()
                .hasClass('parent') &&
              $(N)
                .parent()
                .parent()
                .parent()
                .is(':visible') &&
              $('tr.current.child.facture-annee-' + L).length > 0
            ) {
              B(N)
            }
          })
        } else {
          $('.display-all-facture')
            .removeClass('mask-other-factures')
            .addClass('show-other-factures')
          $.each($('.fp-sprite-chevron-bleu-bottom'), function(L, M) {
            if (
              $(M)
                .parent()
                .parent()
                .parent()
                .hasClass('first-row-child')
            ) {
              $(M)
                .removeClass('fp-sprite-chevron-bleu-bottom')
                .addClass('fp-sprite-chevron-bleu-left')
            }
          })
        }
        K.stopPropagation()
        return false
      })
    $('.telecharger-facture-bleu')
      .unbind()
      .click(function(L) {
        tmsAppListeFactures_telechargerVotreFacture(L)
        try {
          var K = $(this)
            .attr('id')
            .split('_')[2]
          var M = h[K]
          facturePaiementUtils.telechargerFacture(M)
        } catch (L) {
          console.error('Erreur lors du tÃ©lÃ©chargement de la facture')
        }
        L.stopPropagation()
        return false
      })
    $('#fact-sort-date')
      .unbind()
      .click(function(L) {
        var K = $(this)
          .find('.sprite-select')
          .hasClass('fleche-bas')
          ? -1
          : 1
        q(K, 'date')
        L.stopPropagation()
        return false
      })
    $('#fact-sort-montant')
      .unbind()
      .click(function(L) {
        var K = $(this)
          .find('.sprite-select')
          .hasClass('fleche-bas')
          ? -1
          : 1
        q(K, 'montant')
        L.stopPropagation()
        return false
      })
    $('#fact-sort-etat')
      .unbind()
      .click(function(L) {
        var K = $(this)
          .find('.sprite-select')
          .hasClass('fleche-bas')
          ? -1
          : 1
        q(K, 'etat')
        L.stopPropagation()
        return false
      })
    $('#ListeFacture_toggle')
      .unbind()
      .click(function() {
        if (FacturePaiementUtils.isMobileNav) {
          facturePaiementUtils.toggleOnMobile($(this))
        }
      })
  }
  var B = function(L) {
    var K = $(L).text()
    if (
      $(L)
        .parent()
        .parent()
        .parent()
        .hasClass('first-row-child') &&
      $(L)
        .parent()
        .find('i')
        .hasClass('fp-sprite-chevron-bleu-left')
    ) {
      $(L)
        .parent()
        .find('i')
        .removeClass('fp-sprite-chevron-bleu-left')
        .addClass('fp-sprite-chevron-bleu-bottom')
      if (
        $('.first-row-child.facture-annee-' + K).is(':visible') &&
        $('tr.line-table-after-3.facture-annee-' + K).hasClass('hide')
      ) {
        $('tr.line-table-after-3.facture-annee-' + K).removeClass('hide')
      }
    } else {
      $('tr.facture-annee-' + K).toggle()
    }
    if ($('.display-all-facture').hasClass('show-other-factures') && v() == 0) {
      $('.display-all-facture')
        .removeClass('show-other-factures')
        .addClass('mask-other-factures')
      $('.display-all-facture')
        .find('span')
        .toggleClass('hide')
    } else {
      if (
        $('.display-all-facture').hasClass('mask-other-factures') &&
        v() > 0 &&
        n(K) == 0
      ) {
        $('.display-all-facture')
          .removeClass('mask-other-factures')
          .addClass('show-other-factures')
        $('.display-all-facture')
          .find('span')
          .toggleClass('hide')
      }
    }
  }
  var F = function() {
    facturePaiementUtils.render(C, blocErreurContratResilie)
  }
  var y = function() {
    facturePaiementUtils.clean(a)
    facturePaiementUtils.clean(C)
    facturePaiementUtils.hide(e)
    A = null
    h = []
    s = {}
    i = []
  }
  var H = function() {
    y()
    facturePaiementUtils.render(C, facturePaiementUtils.blocLoading)
  }
  var E = function() {
    A = facturePaiementUtils.clone(CompteEnLigne.getInstance().getCurrentCC())
    h = A.factures
    D()
    G()
    u()
  }
  var k = function(K, L, N, R) {
    var P = null
    if (K) {
      var Q = ''
      if (N) {
        Q = ' style="display: none";'
      }
      var M = ''
      if (!L) {
        M = ' hide'
      }
      var O = ''
      if (!R) {
        O = ' row-empty'
      }
      P =
        '<tr class="facture-annee-' +
        K +
        ' parent' +
        O +
        M +
        '"' +
        Q +
        '"><td><span><i class="fp-sprite-chevron-bleu-left"></i><a class="lien-factures show-factures" style="cursor:pointer;">' +
        K +
        '</a></span></td><td></td><td></td><td></td><td></td></tr>'
    }
    return P
  }
  var c = function(ab, Z, K, X, T, O, L, P) {
    var N = null
    if (ab && ab.dateFacture) {
      var S = getYearFromTimestamp(ab.dateFacture)
      var V = '<td></td>'
      var W = ' child'
      var Q = ' style="display: table-row;"'
      var aa = ''
      var Y = ''
      var M = ''
      var R = 'fp-sprite-chevron-bleu-bottom'
      if (P) {
        R = 'fp-sprite-chevron-bleu-left'
      }
      if (T) {
        Q = ' style="display: none;"'
      }
      if (!Z) {
        aa = ' hide'
      }
      if (O) {
        M = ' line-table-after-3'
      }
      if (L) {
        Y = ' row-empty first-row-child'
        W = ' parent'
        V =
          '<td><span><i></i>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a class="lien-factures">' +
          S +
          '</a></span></td>'
      } else {
        if (K) {
          Y = ' first-row-child'
          V =
            '<td><span><i class="' +
            R +
            '"></i><a class="lien-factures show-factures"  style="cursor:pointer;">' +
            S +
            '</a></span></td>'
        }
      }
      var U = '<tr class="facture-annee-' + S + W + Y + aa + M + '"' + Q + '>'
      if (X) {
        U =
          '<tr class="facture-annee-' +
          S +
          W +
          ' current' +
          Y +
          aa +
          M +
          '"' +
          Q +
          '>'
      }
      N =
        U +
        V +
        '<td>' +
        convertTimestampToDate(ab.dateFacture, 1) +
        '</td><td>' +
        ab.getMontantFormate() +
        ' &euro;<sup>TTC</sup></td><td>' +
        t(ab) +
        '</td>'
      if (isNotEmpty(ab.url) && !A.estRole3()) {
        N +=
          '<td><span id="' +
          z +
          ab.id +
          '" class="fp-sprite-download-bleu telecharger-facture-bleu" style="cursor:pointer;"></span></td>'
      } else {
        N += '<td><span>' + J + '</span></td>'
      }
      N += '</tr>'
    }
    return N
  }
  var t = function(L) {
    var K = null
    if (A.soldeEnCours <= 0) {
      K = 'RÃ©glÃ©'
    } else {
      if (L.statutPaiement === 'Non') {
        K = 'A RÃ©gler'
      } else {
        K = 'RÃ©glÃ©'
      }
    }
    return K
  }
  var D = function() {
    try {
      s = sortArrayByYearToJson(h, 'dateFacture')
    } catch (K) {}
  }
  var G = function() {
    if (typeof s === 'object') {
      i = []
      $.each(s, function(K, L) {
        i.push(K)
      })
      i.sort(function(L, K) {
        return K - L
      })
    } else {
      console.error(
        'facturesParAnnee must be an array : typeof(facturesParAnnee)=' +
          typeof s
      )
    }
  }
  var u = function() {
    $.each(i, function(L, K) {
      s[K] = sortJsonArrayByProp(s[K], 'attributes.dateFacture', -1)
      if (L === 0) {
        s[K].shift()
      }
    })
    $.each(i, function(L, K) {
      if (s[K] && s[K].length === 0) {
        delete s[K]
        i.splice(L, 1)
      }
    })
  }
  var w = function() {
    var N = 0
    var M = f + '<tbody id="ListeFacture_table_body">'
    var K
    var L = false
    $.each(i, function(P, O) {
      if (P === 0) {
        K = s[O].length
        if (K == 1) {
          M += c(s[O][0], true, true, true, false, false, true, false)
          N++
        } else {
          M += k(O, true, true, true)
          $.each(s[O], function(Q, R) {
            if (Q === 0) {
              if (K > 3) {
                L = true
              }
              M += c(R, true, true, true, false, false, false, L)
              N++
            } else {
              if (N < 3) {
                M += c(R, true, false, true, false, false, false, false)
              } else {
                M += c(R, false, false, true, false, true, false, false)
              }
              N++
            }
          })
        }
      } else {
        K = s[O].length
        if (K == 1) {
          if (N < 3) {
            M += c(s[O][0], true, true, true, false, false, true, false)
            N++
          } else {
            M += c(s[O][0], false, true, false, false, false, true, false)
          }
        } else {
          if (N < 3) {
            M += k(O, true, true, true)
            $.each(s[O], function(Q, R) {
              if (Q === 0) {
                if (K > 3 - N) {
                  L = true
                } else {
                  L = false
                }
                M += c(R, true, true, true, false, false, false, L)
                N++
              } else {
                if (N < 3) {
                  M += c(R, true, false, true, false, false, false, false)
                } else {
                  M += c(R, false, false, true, false, true, false, false)
                }
                N++
              }
            })
          } else {
            M += k(O, false, false, false)
            $.each(s[O], function(Q, R) {
              if (Q === 0) {
                M += c(R, false, true, false, true, false, false, false)
              } else {
                M += c(R, false, false, false, true, false, false, false)
              }
            })
          }
        }
      }
    })
    M += '</tbody>'
    return M
  }
  var p = function() {
    var N = 0
    var M = ''
    var L
    var K = false
    $.each(i, function(Y, X) {
      if (N >= 3) {
        K = true
      }
      var R = j('tr[class^="facture-annee-' + X + ' parent"]')
      var S = j('tr[class^="facture-annee-' + X + ' child"]')
      var Q = j('tr[class$="line-table-after-3"]')
      var P = $('.parent.facture-annee-' + X).hasClass('hide')
      var V = $('.first-row-child.facture-annee-' + X).hasClass('hide')
      var T = $('tr.line-table-after-3').hasClass('hide')
      var W = $('tr.facture-annee-' + X + '.first-row-child').hasClass(
        'current'
      )
      var O = $('.first-row-child.facture-annee-' + X)
        .find('i')
        .hasClass('fp-sprite-chevron-bleu-left')
      var U = !$('.parent.facture-annee-' + X).hasClass('row-empty')
      L = s[X].length
      if (L == 1) {
        M += c(s[X][0], !V, true, W, S, false, true, false)
        N++
      } else {
        M += k(X, !P, R, U)
        $.each(s[X], function(Z, aa) {
          if (Z === 0) {
            M += c(aa, !V, true, W, S, false, false, O)
            N++
          } else {
            if (N < 3) {
              M += c(aa, !V, false, W, S, false, false, false)
            } else {
              if (!K) {
                M += c(aa, !T, false, W, Q, true, false, false)
              } else {
                M += c(aa, !V, false, W, S, false, false, false)
              }
            }
            N++
          }
        })
      }
    })
    return M
  }
  var j = function(K) {
    var M = false
    try {
      if (
        $(K)
          .attr('style')
          .contains('display: none')
      ) {
        M = true
      }
    } catch (L) {}
    return M
  }
  var q = function(L, N) {
    var K = ''
    switch (N) {
      case 'date':
        K = 'dateFacture'
        break
      case 'etat':
        K = 'statutPaiement'
        break
      case 'montant':
        K = 'montant'
        break
    }
    var M = L * -1
    $.each(i, function(P, O) {
      s[O] = sortJsonArrayByProp(s[O], K, M)
    })
    $('#ListeFacture_table tr th .sprite-select').css({
      '-moz-opacity': '0.33',
      '-khtml-opacity': '0.33',
      opacity: '0.33',
      '-ms-filter': '"progid:DXImageTransform.Microsoft.Alpha"(Opacity=33)',
      filter: 'alpha(opacity=33)'
    })
    $('#fact-sort-' + N + ' .sprite-select')
      .css({
        '-moz-opacity': '1',
        '-khtml-opacity': '1',
        opacity: '1',
        '-ms-filter': '"progid:DXImageTransform.Microsoft.Alpha"(Opacity=100)',
        filter: 'alpha(opacity=100)'
      })
      .toggleClass('fleche-bas')
      .toggleClass('fleche-haut')
    facturePaiementUtils.render(l, p())
    m()
  }
  var g = function() {
    var K = 0
    $.each(i, function(M, L) {
      K += s[L].length
    })
    if (K > 3) {
      return true
    }
    return false
  }
  var v = function() {
    var K = 0
    $.each(i, function(M, L) {
      $.each($('.facture-annee-' + L + '.child'), function(N, O) {
        if ($(O).hasClass('hide') || j(O)) {
          K++
        }
      })
      $.each($('.facture-annee-' + L + '.parent.first-row-child'), function(
        N,
        O
      ) {
        if ($(O).hasClass('hide') || j(O)) {
          K++
        }
      })
    })
    return K
  }
  var n = function(K) {
    var L = 0
    $.each(i, function(N, M) {
      $.each($('.facture-annee-' + M + '.child'), function(O, P) {
        if (
          M != K &&
          !$(P).hasClass('hide') &&
          !$(P).hasClass('current') &&
          !j(P)
        ) {
          L++
        }
      })
      $.each($('.facture-annee-' + M + '.parent.first-row-child'), function(
        O,
        P
      ) {
        if (
          M != K &&
          !$(P).hasClass('hide') &&
          !$(P).hasClass('current') &&
          !j(P)
        ) {
          L++
        }
      })
      $.each($('.facture-annee-' + M + '.parent.row-empty'), function(O, P) {
        if (
          M != K &&
          !$(P).hasClass('hide') &&
          !$(P).hasClass('current') &&
          !j(P)
        ) {
          L++
        }
      })
    })
    return L
  }
  ListeFacture.prototype.init = function() {
    if ($.trim($('#hid_erreurAucuneFacturePrecedente').html()).length) {
      o = $('#hid_erreurAucuneFacturePrecedente').html()
    }
    if ($.trim($('#hid_erreurListeFacturesIndispo').html()).length) {
      I = $('#hid_erreurListeFacturesIndispo').html()
    }
    H()
    E()
    if (A && A.factures) {
      x()
    }
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_FACTURES_LOADED, x)
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_FACTURES_ERROR, r)
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_CHANGECOMPTECONTRATS,
      H
    )
  }
}
$(document).ready(function() {
  var a = new ListeFacture()
  a.init()
})
var DernierPaiement = function() {
  var F = null
  var u = null
  var h = null
  var g = null
  var m = null
  var B = '#DernierPaiement_Zone1_dateDernierPaiement_span1'
  var c = '#DernierPaiement_Zone1_montantPaiement_span1'
  var n = '#DernierPaiement_Zone1_modePaiement_span2'
  var i = '#DernierPaiement_Zone1_modePaiement_span2_rejete'
  var e = '#DernierPaiement_content'
  var r = '#DernierPaiement_ZonePaiement'
  var z = '#DernierPaiement_Zone4_dateProchainPaiement'
  var O = '#DernierPaiement_Zone4_Bloc_dateProchainPaiement'
  var D = '#DernierPaiement_Zone2_mensualisation'
  var j = '#DernierPaiement_Zone3_planMensualisation'
  var a = '#DernierPaiement_Zone3_planApurement'
  var q = '#DernierPaiement_errorZoneMensualisation'
  var J = '#DernierPaiement_error'
  var E = '#DernierPaiement_blocZoneExtra'
  var A = false
  var L = false
  var s = false
  var v =
    "<div class='left'> <span><strong>1</strong> Je simule mon Ã©chÃ©ancier</span><span><strong>2</strong> Je saisis mes coordonÃ©es bancaires</span><span><strong>3</strong> J'active la mensualisation</span></div>	<div class='right'>	<a href='#' class='btn-action btn-green btn-fleche-droite isDeactivateImpersonationLinkOnly'>Commencer<span></span></a>	</div>"
  var p = ''
  DernierPaiement.prototype.init = function() {
    if ($.trim($('#hid_blocDPZoneExtraContent').html()).length) {
      v = $('#hid_blocDPZoneExtraContent').html()
    }
    p =
      $.trim($('#hid_blocDPErreurAucunPaiement').html()).length === 0
        ? facturePaiementUtils.blocErreurAucunPaiement
        : $('#hid_blocDPErreurAucunPaiement').html()
    N()
    b()
    if (F) {
      if (nbElement(F.paiements) > 0) {
        y()
      }
      if (F.planMensualisation) {
        K()
      }
      if (F.planApurement) {
        H()
      }
    }
    G()
    l()
    w()
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_CHANGECOMPTECONTRATS,
      N
    )
  }
  var G = function() {
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_PAIEMENTS_LOADED, y)
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_PAIEMENTS_ERROR, x)
  }
  var l = function() {
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_MENSUALISATIONS_LOADED,
      K
    )
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_MENSUALISATIONS_ERROR,
      o
    )
  }
  var w = function() {
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_APUREMENT_LOADED, H)
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_APUREMENT_ERROR, t)
  }
  var b = function() {
    F = CompteEnLigne.getInstance().getCurrentCC()
    if (F) {
      u = F.getDernierPaiement()
      g = F.getUrlPlanApurement()
      m = F.getUrlPlanMensualisation()
      h = F.getDateProchainPaiement()
    }
  }
  var y = function() {
    M()
    b()
    if (u) {
      facturePaiementUtils.render(B, convertTimestampToDate(u.datePaiement, 2))
      facturePaiementUtils.render(c, u.getMontantFormate() + 'â‚¬')
      if (u.statutPaiement && u.statutPaiement.code === 'R') {
        facturePaiementUtils.render(i)
      } else {
        var Q = 1
        facturePaiementUtils.render(n, u.getModePaiement(Q))
      }
      facturePaiementUtils.render(r)
      facturePaiementUtils.render(e)
      f()
    } else {
      if (
        CompteEnLigne &&
        CompteEnLigne.getInstance() &&
        CompteEnLigne.getInstance().comptesClients &&
        CompteEnLigne.getInstance().ccEnSession &&
        nbElement(
          CompteEnLigne.getInstance().comptesClients[
            CompteEnLigne.getInstance().ccEnSession
          ].paiements
        ) === 0
      ) {
        C()
      } else {
        x()
      }
    }
  }
  var K = function() {
    k()
    b()
    if (F.isMensualise) {
      if (F.estActif() && h) {
        facturePaiementUtils.render(z, convertTimestampToDate(h, 2))
        facturePaiementUtils.render(O)
      }
      I()
    } else {
      if (!A) {
        facturePaiementUtils.render(D)
        s = true
        facturePaiementUtils.hide(j)
        facturePaiementUtils.hide(O)
      }
    }
    facturePaiementUtils.render(e)
    $(E).html(v)
    f()
  }
  var H = function() {
    P()
    b()
    d()
    facturePaiementUtils.render(e)
    f()
  }
  var f = function() {
    $(j)
      .unbind()
      .click(function(Q) {
        if (m) {
          tmsAppDernierPaiement_telechargerPlanMens(Q)
          facturePaiementUtils.downloadDocumentMP(m, 'Plan_Mensualisation.pdf')
        }
      })
    $(a)
      .unbind()
      .click(function(Q) {
        if (g) {
          tmsAppDernierPaiement_telechargerPlanApurement(Q)
          facturePaiementUtils.downloadDocumentMP(g, 'Plan_Apurement.pdf')
        }
      })
  }
  var C = function() {
    console.error('erreur : aucun paiement Ã  afficher')
    M()
    facturePaiementUtils.render(J, p)
  }
  var x = function() {
    console.error('erreur lors du chargement du modÃ¨le')
    M()
    facturePaiementUtils.render(J, facturePaiementUtils.blocErreurLocalisee)
  }
  var o = function() {
    console.error('erreur lors du chargement du modÃ¨le')
    k()
    facturePaiementUtils.render(q)
    facturePaiementUtils.render(e)
  }
  var t = function() {
    console.error('erreur lors du service apurement')
    P()
    facturePaiementUtils.render(e)
  }
  var N = function() {
    M()
    k()
    P()
    F = null
    u = null
    h = null
    g = null
    m = null
    facturePaiementUtils.render(J, facturePaiementUtils.blocLoading)
  }
  var d = function() {
    if (g) {
      if (L) {
        facturePaiementUtils.hide(j)
      }
      if (s) {
        facturePaiementUtils.hide(D)
      }
      facturePaiementUtils.render(a)
      A = true
    }
  }
  var I = function() {
    if (!A && m) {
      facturePaiementUtils.render(j)
      L = true
    }
  }
  var k = function() {
    facturePaiementUtils.hide(D)
    facturePaiementUtils.hide(j)
    facturePaiementUtils.hide(O)
    facturePaiementUtils.hide(q)
    L = false
    s = false
  }
  var M = function() {
    facturePaiementUtils.clean(B)
    facturePaiementUtils.clean(c)
    facturePaiementUtils.clean(n)
    facturePaiementUtils.clean(J)
    facturePaiementUtils.hide(r)
    facturePaiementUtils.hide(i)
  }
  var P = function() {
    facturePaiementUtils.hide(a)
    A = false
  }
}
$(document).ready(function() {
  var a = new DernierPaiement()
  a.init()
})
var ListePaiements = function() {
  var A = null,
    F = null,
    q = null,
    a = null,
    g = null,
    D = null,
    L = null,
    m = [],
    j = 0
  var p =
    '<div><p class="text-center" style="font-weight: bold;"><img src="/content/dam/images/pictos/picto-attention-bleu-45.png"> Oups,<br>Vous nâ€™avez pas encore de paiements enregistrÃ©s sur ce logement. </p></div>'
  var t =
    '<div><p class="text-center" style="font-weight: bold;"><img src="/content/dam/images/pictos/picto-attention-bleu-45.png"> Information<br>Votre liste de prÃ©cÃ©dents paiements  (hors dernier paiement) est vide.  </p></div>'
  var r = 'isFirstRow',
    e = 'hide'
  var G = '#ListePaiements_BlocContent',
    u = '#listePaiements_TabContent',
    E = '#ListePaiements_BlocError'
  var h = '#listePaiements_BtnChangeDisplayMode',
    k = 'isShowingEl',
    B = '.blocBtnChange'
  var y = function() {
    var N = false
    x()
    N = l()
    if (N) {
      w()
      H()
      f()
    } else {
      b()
    }
  }
  var w = function() {
    try {
      if (F) {
        C()
      } else {
        o()
      }
    } catch (N) {
      o()
      console.error(
        '[LISTE PAIEMENTS] , erreurs de recuperation des donnees ' + N
      )
    }
  }
  var o = function() {
    x()
    facturePaiementUtils.render(E, facturePaiementUtils.blocErreurLocalisee)
  }
  var b = function() {
    x()
    facturePaiementUtils.render(E, p)
  }
  var v = function() {
    x()
    facturePaiementUtils.render(E, t)
  }
  var x = function() {
    ;(A = null),
      (F = null),
      (q = null),
      (a = null),
      (g = null),
      (D = null),
      (m = []),
      (j = 0)
    facturePaiementUtils.hide(E)
    facturePaiementUtils.hide(G)
    facturePaiementUtils.clean(u)
    facturePaiementUtils.hide(h)
  }
  var J = function() {
    x()
    facturePaiementUtils.render(E, facturePaiementUtils.blocLoading)
  }
  var l = function() {
    A = CompteEnLigne.getInstance().getCurrentCC()
    if (A && nbElement(A.paiements) > 0) {
      F = facturePaiementUtils.cloneSansRejet(A.paiements)
      return true
    } else {
      return false
    }
  }
  var i = function(T, U) {
    var Q = T.find('.lp-date')
    var O = T.find('.lp-montant')
    var S = T.find('.lp-type')
    if (U) {
      Q.html('')
      O.html('')
      S.html('')
    } else {
      var P = T.data('lp_date')
      Q.html(P)
      var N = T.data('lp_montant')
      N = N + ' â‚¬ <sup>TTC</sup>'
      O.html(N)
      var R = T.data('lp_type')
      S.html(R)
    }
  }
  var n = function(O, N) {
    var P = O.find('i')
    if (N.hasClass('open')) {
      P.toggleClass('fp-sprite-chevron-vert-bottom fp-sprite-chevron-vert-left')
      i(O, true)
      N.removeClass('open')
    } else {
      P.toggleClass('fp-sprite-chevron-vert-bottom fp-sprite-chevron-vert-left')
      i(O)
      N.addClass('open')
    }
  }
  var M = function(N) {
    $('#ListePaiements_BlocContent .sprite-select').css({
      '-moz-opacity': '0.33',
      '-khtml-opacity': '0.33',
      opacity: '0.33',
      '-ms-filter': '"progid:DXImageTransform.Microsoft.Alpha"(Opacity=33)',
      filter: 'alpha(opacity=33)'
    })
    N.css({
      '-moz-opacity': '1',
      '-khtml-opacity': '1',
      opacity: '1',
      '-ms-filter': '"progid:DXImageTransform.Microsoft.Alpha"(Opacity=100)',
      filter: 'alpha(opacity=100)'
    })
  }
  var c = function() {
    for (var N = 0; N < j; N++) {
      if (
        0 == $('.isTrPaiement.isNotFirstRow[data-year=' + m[N] + ']').length
      ) {
        var P = $('.show-paiements[data-year-link=' + m[N] + ']')
        P.removeClass('show-paiements')
        P.replaceWith(function() {
          return $('<span>' + $(this).html() + '</span>')
        })
        var O = $('.isTrYear[data-year=' + m[N] + ']')
        O.find('i').removeClass()
        O.find('.lp-date').html(O.data('lp_date'))
        O.find('.lp-montant').html(O.data('lp_montant') + ' â‚¬ <sup>TTC</sup>')
        O.find('.lp-type').html(O.data('lp_type'))
      }
    }
  }
  var d = function() {
    $('.isTrYear.isNotFirstRow').each(function(N) {
      var P = $(this)
      var O = P.find('i')
      var Q = P.find('.show-paiements')
      i(P, true)
      O.attr('class', '')
      O.addClass('fp-sprite-chevron-vert-left')
      Q.removeClass('open')
      if (!P.hasClass(e)) {
        P.addClass(e)
      }
    })
  }
  var s = function(P, O, N) {
    var S = $(u)
    var R = P.find('.sprite-select')
    if (N) {
      if (P.hasClass('is-sort-asc')) {
        for (var Q = 0; Q < j; Q++) {
          $('tr[data-year=' + m[Q] + ']')
            .sort(function(U, T) {
              if (U.dataset[O] < T.dataset[O]) {
                return -1
              }
              if (U.dataset[O] > T.dataset[O]) {
                return 1
              }
            })
            .appendTo(S)
        }
      } else {
        for (var Q = 0; Q < j; Q++) {
          $('tr[data-year=' + m[Q] + ']')
            .sort(function(U, T) {
              if (U.dataset[O] < T.dataset[O]) {
                return 1
              }
              if (U.dataset[O] > T.dataset[O]) {
                return -1
              }
            })
            .appendTo(S)
        }
      }
    } else {
      if (P.hasClass('is-sort-asc')) {
        for (var Q = 0; Q < j; Q++) {
          $('tr[data-year=' + m[Q] + ']')
            .sort(function(U, T) {
              return +U.dataset[O] - +T.dataset[O]
            })
            .appendTo(S)
        }
      } else {
        for (var Q = 0; Q < j; Q++) {
          $('tr[data-year=' + m[Q] + ']')
            .sort(function(U, T) {
              return +T.dataset[O] - +U.dataset[O]
            })
            .appendTo(S)
        }
      }
    }
    P.toggleClass('is-sort-asc')
    R.toggleClass('fleche-haut fleche-bas')
    I()
    M(R)
  }
  var f = function() {
    $('.show-paiements')
      .unbind()
      .click(function(R) {
        R.preventDefault()
        var Q = $(this)
        var O = Q.closest('.isTrYear')
        var P = $(h)
        var S = Q.data('year-link')
        var N = $('.isTrPaiement[data-year=' + S + ']')
        if (Q.hasClass('defaultPosition')) {
          Q.removeClass('defaultPosition')
        }
        if (Q.hasClass(r)) {
          if (Q.hasClass('open')) {
            N.each(function(T) {
              if (!$(this).hasClass(e)) {
                $(this).addClass(e)
              }
            })
          } else {
            N.each(function(T) {
              if ($(this).hasClass(e)) {
                $(this).removeClass(e)
              }
            })
          }
        } else {
          if (P.hasClass(k)) {
            N.toggleClass(e)
          }
        }
        n(O, Q)
        if (0 == $('.isNotFirstRow.hide').length) {
          if (!P.hasClass(k)) {
            P.addClass(k)
            $(B).toggle()
          }
        }
        if (3 >= $('#listePaiements_TabContent tr').not('.hide').length) {
          if (P.hasClass(k)) {
            P.removeClass(k)
            $(B).toggle()
          }
        }
      })
  }
  var I = function() {
    for (var P = 0; P < j; P++) {
      var Q = $('.isTrYear[data-year=' + m[P] + ']')
      var R = $('tr[data-year=' + m[P] + ']:first')
      var V = false
      var O = Q.find('.show-paiements')
      if (O.length) {
        V = O.hasClass('open')
      } else {
        V = true
      }
      var T = O.hasClass('defaultPosition')
      if (R.index() !== Q.index()) {
        var U = Q.attr('class'),
          N = R.attr('class')
        Q.removeClass()
        R.removeClass()
        R.attr('class', U)
        Q.attr('class', N)
        var S = Q.find('.lp-year').html()
        if (!V && !T) {
          R.find('td').html('')
        }
        R.find('.lp-year').html(S)
        Q.find('.lp-year').html('')
        i(Q)
        f()
      }
    }
  }
  var H = function() {
    $(h)
      .unbind()
      .click(function(O) {
        tmsAppListePrecedentsPaiements_voirLesPrecedentsPaiements(O)
        var N = $(this)
        if (N.hasClass(k)) {
          d()
          $('.isTrYear.isFirstRow').each(function(P) {
            var R = $(this)
            var Q = R.find('i')
            var S = R.find('.show-paiements')
            if (Q.hasClass('fp-sprite-chevron-vert-bottom')) {
              Q.attr('class', '')
              Q.addClass('fp-sprite-chevron-vert-left')
              S.removeClass('open')
              S.addClass('defaultPosition')
            }
          })
          $('.isTrPaiement.isNotFirstRow').each(function(P) {
            if (!$(this).hasClass(e)) {
              $(this).addClass(e)
            }
          })
          N.removeClass(k)
        } else {
          $('.isTrYear.isNotFirstRow').removeClass(e)
          N.addClass(k)
          $('.show-paiements.isFirstRow')
            .not('.open')
            .click()
        }
        $(B).toggle()
      })
    $('#lp-sort-date')
      .unbind()
      .click(function() {
        s($(this), 'lp_date_sort')
      })
    $('#lp-sort-montant')
      .unbind()
      .click(function() {
        s($(this), 'lp_montant')
      })
    $('#lp-sort-type')
      .unbind()
      .click(function() {
        s($(this), 'lp_type_sort', true)
      })
    $('#ListePaiements_toggle')
      .unbind()
      .click(function() {
        if (FacturePaiementUtils.isMobileNav) {
          facturePaiementUtils.toggleOnMobile($(this))
        }
      })
  }
  var K = function(O, P, S, Q) {
    var R = ''
    var N = O
    if (Q) {
      R = O + ' defaultPosition'
    }
    if (S) {
      N = 'isTrYear ' + N
    } else {
      N = 'isTrPaiement ' + N
    }
    P =
      P +
      "<tr class='" +
      N +
      "' data-lp_date=" +
      a +
      ' data-lp_date_sort=' +
      q.datePaiement +
      ' data-lp_type_sort=' +
      q.modePaiement +
      " data-lp_montant='" +
      L +
      "'data-lp_type='" +
      D +
      "'data-year='" +
      g +
      "'>"
    if (S) {
      P =
        P +
        " <td class='lp-year'><i class='fp-sprite-chevron-vert-left'></i><a href='#' class='show-paiements " +
        R +
        "' data-year-link='" +
        g +
        "'>" +
        g +
        '</a></td>'
    } else {
      P = P + "<td class='lp-year'></td>"
    }
    return P
  }
  var z = function(O, N) {
    if (N) {
      O =
        O +
        " <td class='lp-date'></td> <td class='lp-montant'></td> <td class='lp-type'></td></tr>"
    } else {
      O =
        O +
        " <td class='lp-date'>" +
        a +
        "</td> <td class='lp-montant'>" +
        L +
        " &euro; <sup>TTC</sup></td> <td class='lp-type'>" +
        D +
        '</td></tr>'
    }
    return O
  }
  var C = function() {
    var R = '',
      P = '',
      O = false,
      Q,
      N = 0,
      T = false,
      U = 0,
      S = ''
    for (Q in F) {
      q = F[Q]
      D = q.getModePaiement()
      L = Math.abs(q.montant)
      a = convertTimestampToDate(q.datePaiement)
      g = convertTimestampToDate(q.datePaiement, 'only_year')
      if (g !== P) {
        T = true
      }
      if (F.hasOwnProperty(Q)) {
        U++
      }
      if (U > 1) {
        if (N > 2) {
          S = 'isNotFirstRow hide'
        } else {
          S = 'isFirstRow'
        }
        if (N <= 2 && T) {
          R = K(S, R, true, true)
          R = z(R)
          m.push(g)
          P = g
          T = false
        } else {
          if (N > 2 && T) {
            R = K(S, R, true)
            R = z(R, true)
            m.push(g)
            P = g
            T = false
          } else {
            R = K(S, R, false)
            R = z(R)
          }
        }
        N++
      }
    }
    j = m.length
    if (U > 1) {
      facturePaiementUtils.render(u, R)
      facturePaiementUtils.render(G)
      if (U > 4) {
        facturePaiementUtils.render(h)
      }
    } else {
      v()
      return false
    }
    c()
  }
  ListePaiements.prototype.init = function() {
    if ($.trim($('#hid_erreurPaiementsNonExistants').html()).length) {
      p = $('#hid_erreurPaiementsNonExistants').html()
    }
    if ($.trim($('#hid_erreurPaiementsOnlyOne').html()).length) {
      t = $('#hid_erreurPaiementsOnlyOne').html()
    }
    J()
    var N = false
    N = l()
    if (N) {
      x()
      w()
      H()
      f()
    }
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_PAIEMENTS_LOADED, y)
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_PAIEMENTS_ERROR, o)
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_CHANGECOMPTECONTRATS,
      J
    )
  }
}
$(document).ready(function() {
  var a = new ListePaiements()
  a.init()
})
var ChequeEnergieListePaiements = function() {
  var N = null
  var C = null
  var r = null
  var B = null
  var d = null
  var o = null
  var P = null
  var Y = null
  var w = []
  var t = 0
  var z =
    '<div><p class="text-center" style="font-weight: bold;"><img src="/content/dam/images/pictos/picto-attention-bleu-45.png"><br>Oups,<br>Vous nâ€™avez pas encore de paiements par chÃ¨que Ã©nergie enregistrÃ©s sur ce logement. </p></div>'
  var j = 'hide'
  var s = '#bloc_chequeEnergie_paiements'
  var H = '#title_montantCheque'
  var G = '#title_annee'
  var J = '#description_cheque_periode_validite'
  var E = '#description_attestation'
  var x = '#bloc_preaffect_attestation'
  var u = '#btn_preaffect'
  var e = '.bloc-ce-paiement'
  var l = '#ListePaiementsCE_BlocContent'
  var I = '#listePaiementsCE_TabContent'
  var S = '#ListePaiementsCE_BlocError'
  var L = '#btnToggle_listePaiementsCE'
  var a = '#bloc_chequeEnergie_paiements .separate'
  ChequeEnergieListePaiements.prototype.init = function() {
    if ($.trim($('#chequeEnergie_erreurPaiementsNonExistants').html()).length) {
      z = $('#chequeEnergie_erreurPaiementsNonExistants').html()
    }
    if (p()) {
      k()
    } else {
      v()
    }
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_PERSONNE_LOADED, A)
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_PERSONNE_ERROR, R)
  }
  var p = function() {
    C = CompteEnLigne.getInstance().chequeEnergie
    if (C) {
      return true
    }
    C = null
    return false
  }
  var k = function() {
    tmsAppChequeEnergieListePaiements_affichagePush()
    U()
    M()
    c()
  }
  var D = function() {
    C = null
    facturePaiementUtils.render(H, '###.##')
    facturePaiementUtils.render(G, '####')
    facturePaiementUtils.render(J, 'DD/MM/AAAA - DD/MM/AAAA')
    facturePaiementUtils.hide(E)
    facturePaiementUtils.hide(a)
    facturePaiementUtils.hide(x)
    facturePaiementUtils.hide(s)
  }
  var A = function() {
    var ac = false
    D()
    ac = p()
    if (ac) {
      tmsAppChequeEnergieListePaiements_affichagePush()
      U()
      M()
    } else {
      facturePaiementUtils.hide(s)
      v()
    }
  }
  var R = function() {
    D()
  }
  var U = function() {
    if (C.montant) {
      facturePaiementUtils.render(H, C.montant.toFixed(2))
    }
    if (C.dateDebutValiditeCheque && C.dateFinValiditeCheque) {
      var ac = convertTimestampToDate(C.dateDebutValiditeCheque, 'only_year')
      var ae = convertTimestampToDate(C.dateFinValiditeCheque, 'only_year')
      if (ac == ae) {
        facturePaiementUtils.render(G, ae)
      } else {
        facturePaiementUtils.render(G, ac + '-' + ae)
      }
      var af = convertTimestampToDate(C.dateDebutValiditeCheque)
      var ad = convertTimestampToDate(C.dateFinValiditeCheque)
      var ag = af + ' - ' + ad
      facturePaiementUtils.render(J, ag)
    }
    if (C.numeroAttestation) {
      facturePaiementUtils.render(E)
    }
    if (!C.canalCheque || (C.canalCheque && C.canalCheque != '05')) {
      facturePaiementUtils.render(a)
      facturePaiementUtils.render(x)
      O()
    }
    facturePaiementUtils.render(s)
    Z()
  }
  var M = function() {
    $(L)
      .unbind()
      .click(function(ad) {
        var ac = $(this)
        if (ac.hasClass('open')) {
          ac.removeClass('open')
          facturePaiementUtils.hide(e)
        } else {
          tmsAppChequeEnergieListePaiements_afficherLesPaiements(ad)
          ac.addClass('open')
          facturePaiementUtils.render(e)
        }
        ac.find('span').toggleClass('hide')
      })
  }
  var O = function() {
    $(u)
      .unbind()
      .click(function(ad) {
        var ac = $('#chequeEnergie_urlPreaffectation').html()
        tmsAppChequeEnergieListePaiements_effectuerLaPreaffectation(ad)
        window.open(ac, '_blank')
      })
  }
  var c = function() {
    var ac = false
    Q()
    i()
    ac = X()
    if (ac) {
      b()
      n()
      m()
    }
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_PAIEMENTS_LOADED, h)
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_PAIEMENTS_ERROR, aa)
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_CHANGECOMPTECONTRATS,
      Q
    )
  }
  var X = function() {
    N = CompteEnLigne.getInstance().getCurrentCC()
    if (N) {
      r = facturePaiementUtils.clonePaiementsCE(N.paiements)
      if (nbElement(r) > 0) {
        return true
      } else {
        r = null
      }
    }
    return false
  }
  var h = function() {
    var ac = false
    i()
    ac = X()
    if (ac) {
      b()
      n()
      m()
    } else {
      f()
    }
  }
  var b = function() {
    try {
      if (r) {
        T()
      } else {
        aa()
      }
    } catch (ac) {
      aa()
      console.error(
        '[LISTE PAIEMENTS CE] , erreurs de recuperation des donnees ' + ac
      )
    }
  }
  var aa = function() {
    i()
    facturePaiementUtils.render(S, facturePaiementUtils.blocErreurLocalisee)
  }
  var f = function() {
    i()
    facturePaiementUtils.render(S, z)
  }
  var i = function() {
    N = null
    r = null
    B = null
    d = null
    o = null
    P = null
    w = []
    t = 0
    facturePaiementUtils.hide(S)
    facturePaiementUtils.hide(l)
    facturePaiementUtils.clean(I)
  }
  var Q = function() {
    i()
    facturePaiementUtils.render(S, facturePaiementUtils.blocLoading)
  }
  var n = function() {
    $('#lpce-sort-date')
      .unbind()
      .click(function() {
        F($(this), 'lpce_date_sort')
      })
    $('#lpce-sort-montant')
      .unbind()
      .click(function() {
        F($(this), 'lpce_montant')
      })
    $('#lpce-sort-type')
      .unbind()
      .click(function() {
        F($(this), 'lpce_type_sort', true)
      })
    $('#ListePaiementsCE_toggle')
      .unbind()
      .click(function() {
        if (FacturePaiementUtils.isMobileNav) {
          facturePaiementUtils.toggleOnMobile($(this))
        }
      })
  }
  var m = function() {
    $('.show-ce-paiements')
      .unbind()
      .click(function(af) {
        af.preventDefault()
        var ae = $(this)
        var ad = ae.closest('.isTrYearCE')
        var ag = ae.data('year-link')
        var ac = $('.isTrPaiementCE[data-ce-year=' + ag + ']')
        if (ae.hasClass('defaultPosition')) {
          ae.removeClass('defaultPosition')
        }
        if (ae.hasClass('open')) {
          ac.each(function(ah) {
            if (!$(this).hasClass(j)) {
              $(this).addClass(j)
            }
          })
        } else {
          ac.each(function(ah) {
            if ($(this).hasClass(j)) {
              $(this).removeClass(j)
            }
          })
        }
        y(ad, ae)
      })
  }
  var T = function() {
    var af = '',
      ad = '',
      ae,
      ac = 0,
      ah = false,
      ai = 0,
      ag = ''
    for (ae in r) {
      B = r[ae]
      P = B.getModePaiement()
      Y = Math.abs(B.montant)
      d = convertTimestampToDate(B.datePaiement)
      o = convertTimestampToDate(B.datePaiement, 'only_year')
      if (o !== ad) {
        ah = true
        w.push(o)
      }
      if (r.hasOwnProperty(ae)) {
        ai++
      }
      ag = ''
      if (ah) {
        if (w.length == 1) {
          af = W(ag, af, true, true)
          af = K(af)
        } else {
          af = W(ag, af, true)
          af = K(af, true)
        }
        ad = o
        ah = false
      } else {
        ag = w.length > 1 ? 'hide' : ag
        af = W(ag, af, false)
        af = K(af)
      }
      ac++
    }
    t = w.length
    if (ai > 0) {
      facturePaiementUtils.render(I, af)
      facturePaiementUtils.render(l)
      g()
    }
  }
  var q = function(ah, aj) {
    var ae = ah.find('.lpce-date')
    var ad = ah.find('.lpce-montant')
    var ag = ah.find('.lpce-type')
    if (aj) {
      ae.html('')
      ad.html('')
      ag.html('')
    } else {
      var ai = ah.data('lpce_date')
      ae.html(ai)
      var af = ah.data('lpce_montant')
      af = af + ' â‚¬ <sup>TTC</sup>'
      ad.html(af)
      var ac = ah.data('lpce_type')
      ag.html(ac)
    }
  }
  var y = function(ad, ac) {
    var ae = ad.find('i')
    if (ac.hasClass('open')) {
      ae.toggleClass(
        'fp-sprite-chevron-bleuClair-bottom fp-sprite-chevron-bleuClair-left'
      )
      q(ad, true)
      ac.removeClass('open')
    } else {
      ae.toggleClass(
        'fp-sprite-chevron-bleuClair-bottom fp-sprite-chevron-bleuClair-left'
      )
      q(ad)
      ac.addClass('open')
    }
  }
  var ab = function(ac) {
    $('#ListePaiementsCE_BlocContent .sprite-select').css({
      '-moz-opacity': '0.33',
      '-khtml-opacity': '0.33',
      opacity: '0.33',
      '-ms-filter': '"progid:DXImageTransform.Microsoft.Alpha"(Opacity=33)',
      filter: 'alpha(opacity=33)'
    })
    ac.css({
      '-moz-opacity': '1',
      '-khtml-opacity': '1',
      opacity: '1',
      '-ms-filter': '"progid:DXImageTransform.Microsoft.Alpha"(Opacity=100)',
      filter: 'alpha(opacity=100)'
    })
  }
  var g = function() {
    for (var ac = 0; ac < t; ac++) {
      if (0 == $('.isTrPaiementCE[data-ce-year=' + w[ac] + ']').length) {
        var ae = $('.show-ce-paiements[data-year-link=' + w[ac] + ']')
        ae.removeClass('show-ce-paiements')
        ae.replaceWith(function() {
          return $('<span>' + $(this).html() + '</span>')
        })
        var ad = $('.isTrYearCE[data-ce-year=' + w[ac] + ']')
        ad.find('i').removeClass()
        ad.find('.lpce-date').html(ad.data('lpce_date'))
        ad.find('.lpce-montant').html(
          ad.data('lpce_montant') + ' â‚¬ <sup>TTC</sup>'
        )
        ad.find('.lpce-type').html(ad.data('lpce_type'))
      }
    }
  }
  var F = function(aj, ae, ac) {
    var ak = $(I)
    var ah = aj.find('.sprite-select')
    if (ac) {
      if (aj.hasClass('is-sort-asc')) {
        for (var ai = 0; ai < t; ai++) {
          $('.ce-paiement-table tr[data-ce-year=' + w[ai] + ']')
            .sort(function(am, al) {
              if (am.dataset[ae] < al.dataset[ae]) {
                return -1
              }
              if (am.dataset[ae] > al.dataset[ae]) {
                return 1
              }
            })
            .appendTo(ak)
        }
      } else {
        for (var ag = 0; ag < t; ag++) {
          $('.ce-paiement-table tr[data-ce-year=' + w[ag] + ']')
            .sort(function(am, al) {
              if (am.dataset[ae] < al.dataset[ae]) {
                return 1
              }
              if (am.dataset[ae] > al.dataset[ae]) {
                return -1
              }
            })
            .appendTo(ak)
        }
      }
    } else {
      if (aj.hasClass('is-sort-asc')) {
        for (var af = 0; af < t; af++) {
          $('.ce-paiement-table tr[data-ce-year=' + w[af] + ']')
            .sort(function(am, al) {
              return +am.dataset[ae] - +al.dataset[ae]
            })
            .appendTo(ak)
        }
      } else {
        for (var ad = 0; ad < t; ad++) {
          $('.ce-paiement-table tr[data-ce-year=' + w[ad] + ']')
            .sort(function(am, al) {
              return +al.dataset[ae] - +am.dataset[ae]
            })
            .appendTo(ak)
        }
      }
    }
    aj.toggleClass('is-sort-asc')
    ah.toggleClass('fleche-haut fleche-bas')
    V()
    ab(ah)
  }
  var V = function() {
    for (var ae = 0; ae < t; ae++) {
      var af = $('.isTrYearCE[data-ce-year=' + w[ae] + ']')
      var ag = $('.ce-paiement-table tr[data-ce-year=' + w[ae] + ']:first')
      var ak = false
      var ad = af.find('.show-ce-paiements')
      if (ad.length) {
        ak = ad.hasClass('open')
      } else {
        ak = true
      }
      var ai = ad.hasClass('defaultPosition')
      if (ag.index() !== af.index()) {
        var aj = af.attr('class'),
          ac = ag.attr('class')
        af.removeClass()
        ag.removeClass()
        ag.attr('class', aj)
        af.attr('class', ac)
        var ah = af.find('.lpce-year').html()
        if (!ak && !ai) {
          ag.find('td').html('')
        }
        ag.find('.lpce-year').html(ah)
        af.find('.lpce-year').html('')
        q(af)
        m()
      }
    }
  }
  var W = function(ad, ae, ah, af) {
    var ag = ''
    var ac = ad
    if (af) {
      ag = ad + ' defaultPosition'
    }
    if (ah) {
      ac = 'isTrYearCE ' + ac
    } else {
      ac = 'isTrPaiementCE ' + ac
    }
    ae =
      ae +
      "<tr class='" +
      ac +
      "' data-lpce_date=" +
      d +
      ' data-lpce_date_sort=' +
      B.datePaiement +
      ' data-lpce_type_sort=' +
      B.modePaiement +
      " data-lpce_montant='" +
      Y +
      "'data-lpce_type='" +
      P +
      "'data-ce-year='" +
      o +
      "'>"
    if (ah) {
      ae =
        ae +
        " <td class='lpce-year'><i class='fp-sprite-chevron-bleuClair-left'></i><a href='#' class='show-ce-paiements " +
        ag +
        "' data-year-link='" +
        o +
        "'>" +
        o +
        '</a></td>'
    } else {
      ae = ae + "<td class='lpce-year'></td>"
    }
    return ae
  }
  var K = function(ad, ac) {
    if (ac) {
      ad =
        ad +
        " <td class='lpce-date'></td> <td class='lpce-montant'></td> <td class='lpce-type'></td></tr>"
    } else {
      ad =
        ad +
        " <td class='lpce-date'>" +
        d +
        "</td> <td class='lpce-montant'>" +
        Y +
        " &euro; <sup>TTC</sup></td> <td class='lpce-type'>" +
        P +
        '</td></tr>'
    }
    return ad
  }
  var v = function() {
    $('.htmlPush.htmlPushChequeEnergie')
      .parent()
      .removeClass('hidden')
  }
  var Z = function() {
    $('.htmlPush.htmlPushChequeEnergie')
      .parent()
      .addClass('hidden')
  }
}
$(document).ready(function() {
  $('.htmlPush.htmlPushChequeEnergie')
    .parent()
    .addClass('hidden')
  var a = $('#activationPushCE').text()
  if (a == 'ON') {
    var b = new ChequeEnergieListePaiements()
    b.init()
  } else {
    $('.htmlPush.htmlPushChequeEnergie')
      .parent()
      .removeClass('hidden')
  }
})
var JustificatifDomicile = function() {
  var i = null
  var k = null
  var e = null
  var d = null
  var s = '#JustificatifDomicile_content'
  var h = '#JustificatifDomicile_justificatifDual'
  var a = '#JustificatifDomicile_justificatifElec'
  var t = '#JustificatifDomicile_justificatifGaz'
  var j = '#JustificatifDomicile_FicheRenseignement'
  var o = '#JustificatifDomicile_error'
  var r = '#lien-telecharger-attestation-titulaire-dual'
  var l = '#lien-telecharger-attestation-titulaire-elec'
  var u = '#lien-telecharger-attestation-titulaire-gaz'
  var b = '#lien-telecharger-fiche-renseignement'
  var m = function() {
    v()
    g()
    if (i && nbElement(i.contrats) > 0 && !i.estRole3() && i.estActif()) {
      var x = i.estTR()
      if (k != null) {
        facturePaiementUtils.renderLink(h)
        $(r).attr('data-id', k.id)
      } else {
        if (e != null && d != null) {
          $(l).attr('data-id', e.id)
          facturePaiementUtils.renderLink(a)
          $(u).attr('data-estTR', x)
          $(u).attr('data-id', d.id)
          facturePaiementUtils.renderLink(t)
        } else {
          if (e != null) {
            $(l).attr('data-id', e.id)
            facturePaiementUtils.renderLink(a)
          }
          if (d != null) {
            $(u).attr('data-estTR', x)
            $(u).attr('data-id', d.id)
            facturePaiementUtils.renderLink(t)
          }
        }
      }
      checkClickTelechargerAttestationTitulaireV2(
        '.lien-telecharger-attestation-titulaire',
        facturePaiementUtils.is2DDoc
      )
      facturePaiementUtils.render(s)
    } else {
      facturePaiementUtils.hide(s)
    }
  }
  var q = function() {
    w()
    if (i && !i.estRole3() && i.estActif()) {
      var x = i.estTR()
      facturePaiementUtils.render(j)
      $(b).attr('data-estTR', x)
      checkClickTelechargerFicheRenseignement(
        '.lien-telecharger-fiche-renseignement'
      )
      facturePaiementUtils.render(s)
    }
  }
  var g = function() {
    c()
    if (i) {
      var x = i.contrats
      $.each(x, function(y, z) {
        switch (z.type) {
          case 'ELEC':
            e = z
            break
          case 'GAZ':
            d = z
            break
          case 'DUAL':
            k = z
            break
        }
      })
    }
  }
  var p = function() {
    v()
    facturePaiementUtils.render(o, facturePaiementUtils.blocErreurLocalisee)
  }
  var f = function() {
    v()
    w()
    facturePaiementUtils.render(o, facturePaiementUtils.blocLoading)
    facturePaiementUtils.render(s)
  }
  var n = function() {
    v()
    w()
    facturePaiementUtils.render(
      o,
      facturePaiementUtils.blocErreurContratResilie
    )
  }
  var v = function() {
    facturePaiementUtils.cleanLink(t)
    facturePaiementUtils.cleanLink(a)
    facturePaiementUtils.cleanLink(h)
    facturePaiementUtils.clean(o)
    i = null
    k = null
    e = null
    d = null
  }
  var w = function() {
    facturePaiementUtils.cleanLink(j)
  }
  var c = function() {
    i = CompteEnLigne.getInstance().getCurrentCC()
  }
  JustificatifDomicile.prototype.init = function() {
    f()
    g()
    if (i) {
      q()
      if (nbElement(i.contrats) > 0) {
        m()
      }
    }
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_COMPTESCONTRATS_LOADED,
      q
    )
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_CONTRATS_LOADED, m)
    factoryUtils.listenEvent(dataFactory.config.DF_EVENT_CONTRATS_ERROR, p)
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_CHANGECOMPTECONTRATS,
      f
    )
  }
}
$(document).ready(function() {
  var a = new JustificatifDomicile()
  a.init()
})
var ProchainPaiments = function() {
  var a = null
  var e = null
  var m = '#ProchainPaiements_content'
  var n = '#ProchainPaiements_listeEcheances'
  var k = '#ProchainPaiements_AffichageEtendueProchainPaiements'
  var o = '#ProchainPaiements_AffichageReduitProchainPaiements'
  var f = '#ProchainPaiements_nb_jours_depuis_resilisation'
  var i = '#ProchainPaiements_nb_lignes'
  var l = function() {
    g()
    d()
    try {
      if (
        a &&
        a.estActif() &&
        e &&
        nbElement(e) > 0 &&
        !a.delaisResiliationDepasse(facturePaiementUtils.getContribution(f))
      ) {
        j()
        c()
      } else {
        h()
      }
    } catch (p) {
      h()
      console.error(
        '[PROCHAIN PAIEMENTS] , erreurs de recuperation des donnees ' + p
      )
    }
  }
  var h = function() {
    g()
  }
  var b = function() {
    g()
  }
  var g = function() {
    facturePaiementUtils.hide(m)
    facturePaiementUtils.clean(n)
    facturePaiementUtils.hide(k)
    facturePaiementUtils.hide(o)
    a = null
    e = null
  }
  var d = function() {
    a = CompteEnLigne.getInstance().getCurrentCC()
    if (a && a.planMensualisation) {
      e = facturePaiementUtils.clone(a.planMensualisation.echeances)
    }
  }
  var c = function() {
    $(k)
      .unbind()
      .click(function() {
        $(m)
          .find('.item-liste-to-hide')
          .toggleClass('hide')
        $(k).hide()
        $(o).show()
      })
    $(o)
      .unbind()
      .click(function(p) {
        tmsAppProchainsPaiements_voirLesProchainsPaiements(p)
        $(m)
          .find('.item-liste-to-hide')
          .toggleClass('hide')
        $(k).show()
        $(o).hide()
      })
  }
  var j = function() {
    var r = ''
    var s = facturePaiementUtils.getContribution(i)
    var u = nbElement(e) > s ? s : nbElement(e)
    for (var q = 0; q < u; q++) {
      try {
        var p = e[q]
        var v = nbElement(e) > 3 && q > 2 ? 'item-liste-to-hide hide' : ''
        r =
          r +
          "<tr class='" +
          v +
          "'>  <td>" +
          convertTimestampToDate(p.dateEcheance) +
          '</td>  <td>' +
          p.getMontantFormate() +
          ' &euro; <sup>TTC</sup></td>  <td>PrÃ©lÃ¨vement automatique mensuel</td></tr>'
      } catch (t) {
        console.error('[PROCHAIN PAIEMENTS] , erreurs de parsin echeances ' + t)
      }
    }
    if (nbElement(e) > 3) {
      facturePaiementUtils.render(o)
    }
    facturePaiementUtils.render(n, r)
    facturePaiementUtils.render(m)
  }
  ProchainPaiments.prototype.init = function() {
    d()
    if (a && e) {
      l()
    }
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_MENSUALISATIONS_LOADED,
      l
    )
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_MENSUALISATIONS_ERROR,
      h
    )
    factoryUtils.listenEvent(
      dataFactory.config.DF_EVENT_CHANGECOMPTECONTRATS,
      b
    )
  }
}
$(document).ready(function() {
  var a = new ProchainPaiments()
  a.init()
})
var FactureEtPaiementsController = function() {
  FactureEtPaiementsController.prototype.loadAllServices = function() {
    this.loadService('PERSONNE')
    this.loadService('COMPTESCONTRATS')
    this.loadService('PAIEMENTS')
    this.loadService('FACTURES')
    this.loadService('CONTRATS')
    this.loadService('MENSUALISATIONS')
    this.loadService('APUREMENT')
  }
  FactureEtPaiementsController.prototype.loadService = function(c) {
    switch (c) {
      case 'COMPTESCONTRATS':
        dataFactory.loadService('COMPTESCONTRATS', {
          async: true,
          cache: false,
          type: 'GET',
          contentType: 'application/json; charset=utf-8',
          success: function(f, g, e) {},
          error: function(e, g, f) {}
        })
        break
      case 'PAIEMENTS':
        var a = { index: 0, taille: 60 }
        var d = 99
        dataFactory.loadService('PAIEMENTS', {
          async: true,
          cache: false,
          type: 'GET',
          data: { offset: d, index: a.index, taille: a.taille },
          contentType: 'application/json; charset=utf-8',
          success: function(f, g, e) {},
          error: function(e, g, f) {}
        })
        break
      case 'FACTURES':
        var b = new Date()
        b.setFullYear(b.getFullYear() - 5)
        dataFactory.loadService('FACTURES', {
          async: true,
          cache: false,
          type: 'GET',
          data: {
            dateDebutIntervalle: JSON.parse(JSON.stringify(b)),
            dateFinIntervalle: JSON.parse(JSON.stringify(new Date()))
          },
          needHeaderClientIds: false,
          headers: { version: 2 },
          contentType: 'application/json; charset=utf-8',
          success: function(f, g, e) {},
          error: function(e, g, f) {}
        })
        break
      case 'CONTRATS':
        dataFactory.loadService('CONTRATS', {
          async: true,
          cache: false,
          type: 'POST',
          data: '1',
          contentType: 'text/plain',
          success: function(f, g, e) {},
          error: function(e, g, f) {}
        })
        break
      case 'MENSUALISATIONS':
        dataFactory.loadService('MENSUALISATIONS', {
          async: true,
          cache: false,
          needHeaderClientIds: true,
          headers: { version: 2 },
          data: { flagObtentionUrl: 'true' },
          type: 'GET',
          contentType: 'application/json; charset=utf-8',
          success: function(f, g, e) {},
          error: function(e, g, f) {}
        })
        break
      case 'APUREMENT':
        dataFactory.loadService('APUREMENT', {
          async: true,
          cache: false,
          type: 'GET',
          headers: { version: 2 },
          needHeaderClientIds: false,
          contentType: 'application/json; charset=utf-8',
          success: function(f, g, e) {},
          error: function(e, g, f) {}
        })
        break
      case 'PERSONNE':
        dataFactory.loadService('PERSONNE', {
          async: true,
          cache: false,
          type: 'GET',
          contentType: 'application/json; charset=utf-8',
          success: function(f, g, e) {},
          error: function(e, g, f) {}
        })
        break
      default:
        console.warn(
          '[FactureEtPaiementsController.loadServices] no service name "' +
            c +
            ' found"'
        )
        break
    }
  }
  FactureEtPaiementsController.prototype.requestListeService = function() {
    var b = CompteEnLigne.getInstance()
    if (b.getCurrentCC() && nbElement(b.getCurrentCC().services) <= 0) {
      var a = {
        infoEligibiliteEntree: {
          BP: b.refBP,
          numeroCC: b.ccEnSession,
          idApplicatif: b.refBP
        }
      }
      dataFactory.loadService('SERVICES', {
        cache: false,
        type: 'POST',
        data: JSON.stringify(a),
        contentType: 'application/json; charset=utf-8',
        success: function(d, e, c) {},
        error: function(c, e, d) {}
      })
    } else {
      factoryUtils.fireEvent(dataFactory.config.DF_EVENT_SERVICES_LOADED)
    }
  }
  FactureEtPaiementsController.prototype.coordinate = function() {
    var a = CompteEnLigne.getInstance()
    if (!a.refBP && !a.ccEnSession) {
      this.loadAllServices()
    } else {
      if (!a.refBP) {
        this.loadService('PERSONNE')
      } else {
        factoryUtils.fireEvent(dataFactory.config.DF_EVENT_PERSONNE_LOADED)
      }
      if (nbElement(a.comptesClients) <= 0) {
        this.loadService('COMPTESCONTRATS')
      } else {
        factoryUtils.fireEvent(
          dataFactory.config.DF_EVENT_COMPTESCONTRATS_LOADED
        )
      }
      var b = a.getCurrentCC()
      if (!b || nbElement(b.paiements) <= 0) {
        this.loadService('PAIEMENTS')
      } else {
        factoryUtils.fireEvent(dataFactory.config.DF_EVENT_PAIEMENTS_LOADED)
      }
      if (!b || nbElement(b.factures) <= 0) {
        this.loadService('FACTURES')
      } else {
        factoryUtils.fireEvent(dataFactory.config.DF_EVENT_FACTURES_LOADED)
      }
      if (!b || b.needToRecallContrat()) {
        this.loadService('CONTRATS')
      } else {
        factoryUtils.fireEvent(dataFactory.config.DF_EVENT_CONTRATS_LOADED)
      }
      if (
        !b ||
        !b.planMensualisation ||
        b.planMensualisation.echeances.length <= 0
      ) {
        this.loadService('MENSUALISATIONS')
      } else {
        factoryUtils.fireEvent(
          dataFactory.config.DF_EVENT_MENSUALISATIONS_LOADED
        )
      }
      if (!b || !b.planApurement) {
        this.loadService('APUREMENT')
      } else {
        factoryUtils.fireEvent(dataFactory.config.DF_EVENT_APUREMENT_LOADED)
      }
    }
  }
}

function loadFactureEtPaiementsController() {
  var a = new FactureEtPaiementsController()
  a.coordinate()
}

function loadFactureEtPaiementsControllerOnNewCC() {
  var a = CompteEnLigne.getInstance()
  if (a && a.getCurrentCC()) {
    a.getCurrentCC().factures = {}
  }
  loadFactureEtPaiementsController()
}

$(document).ready(function() {
  loadFactureEtPaiementsController()
  factoryUtils.listenEvent(
    dataFactory.config.DF_EVENT_CHANGECOMPTECONTRATS,
    loadFactureEtPaiementsControllerOnNewCC
  )
})
