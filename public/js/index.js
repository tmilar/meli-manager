/* eslint-env jquery */
const apiUrl = document.location.href // 'https://jusimil-meli-manager.now.sh'

const dateDaysAgo = (days = 7) => new Date(Date.now() - (1000 * 60 * 60 * 24 * days))

const toDDMMYY = date => `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth()).padStart(2, '0')}-${date.getFullYear() % 1000}`

const state = {
  loading: false
}

const _onLoad = () => $('#sincronizar').on('click', () => {
  if (state.loading) {
    console.log('already loading! please wait')
    return
  }
  state.loading = true

  const dots = 5
  const start = 0
  const intervalMs = 1000
  let i = 3
  const loadingInterval = setInterval(() => {
    i = i > dots ? start : ++i
    $('#info').html(`<p>Cargando${'.'.repeat(i)}</p>`)
  }, intervalMs)
  const $actionButton = $('#sincronizar')
  $actionButton.prop('disabled', 'disabled')
  $actionButton.addClass('loading')

  const _onDone = () => {
    console.log('done')
    clearInterval(loadingInterval)

    $actionButton.removeClass('loading')
    $actionButton.prop('disabled', false)
    state.loading = false
  }

  const settings = {
    async: true,
    crossDomain: true,
    url: `${apiUrl}question?start=${toDDMMYY(dateDaysAgo(7))}&store=true`,
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
      Host: apiUrl,
      'Accept-Encoding': 'gzip, deflate',
      Connection: 'keep-alive'
    },
    success: data => {
      _onDone()
      $('#info').html('<p>¡Sincronización exitosa!</p>')
      console.log('success', data)
    },
    error: error => {
      _onDone()
      $('#info').html('<p>Ocurrio un error :(</p>')
      console.error('error: ', error)
    }
  }

  $.ajax(settings)
})

$(document).ready(() => {
  console.log('Ready!')
  _onLoad()
})
