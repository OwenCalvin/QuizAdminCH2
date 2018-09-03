const fs = require('fs')
const qs = require('querystring')
const { parse } = require('node-html-parser')
const questions = require('./questions')

const username = '4INF-HP-M'

const quiz = require('axios').default.create({
  baseURL: 'https://www.onlinequizcreator.com/',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
})

const addCookie = (key, value) => {
  quiz.defaults.headers.Cookie =  (quiz.defaults.headers.Cookie ? quiz.defaults.headers.Cookie + '; ' : '') + `${key}=${value}`
}

const tokenName = 'X-CSRF-Token'

const main = async () => {
  while (true) {
    const rBegin = await quiz.get('index.php?r=quiz/countdown&id=342457&language=fr&countdown=true')
    const token = rBegin.data.substr(rBegin.data.indexOf(tokenName) + tokenName.length + 4, 88)
    const sess = rBegin.headers['set-cookie'][0].split(';')[0].split('=')[1]
  
    console.log('CSRF:', token)
    console.log('PHPSESSID:', sess)
  
    addCookie('PHPSESSID', sess)
    await quiz.post('index.php?r=quiz/login&id=342457&language=fr', qs.stringify({
      _csrf: token,
      'RegisterUnverifiedParticipantForm[username]': username
    }))
    addCookie('store_name', username)
  
    // Apply loggin on server
    await quiz.get('index.php?r=quiz/countdown&id=342457&language=fr&countdown=true')
  
    let questionNumber = 1
    // Logged
    await new Promise(async resolve => {
      let answering = true
      while (answering) {
        try {
          const htmlQuestion = parse((await quiz.get('index.php/?r=quiz/question&language=fr')).data.question)
          let question = htmlQuestion.querySelector('h1').text
          question = question.substring(3, question.length).replace('\n', '').trim()
          const answer = questions.get(question)
          const answerIndex = htmlQuestion.querySelectorAll('label span').findIndex(a => a.text.trim() === answer)
          const rAnswer = await quiz.post('index.php?r=quiz/answer&language=fr', qs.stringify({
            _csrf: token,
            'answer[]': answerIndex,
          }))
          console.log(questionNumber, question, answer, rAnswer.data.score)
          questionNumber++
        } catch (err) {
          answering = false
          questionNumber = 1
          const now = Date.now()
          fs.writeFile(`./${now}.html`, (await quiz.get('index.php?r=quiz/ranking&language=fr')).data, () => console.log(`Check the result: ${now}.html`))
          delete quiz.defaults.headers.Cookie
          resolve()
        }
      }
    })
  }
}

main()
