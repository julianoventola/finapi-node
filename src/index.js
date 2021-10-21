const express = require("express")
const { v4: uuidv4 } = require("uuid")

const app = express()

app.use(express.json())

const customers = []

// Middlewares
function verifyIfExistsAccountByCPF(request, response, next) {
  const { cpf } = request.headers
  const customer = customers.find((user) => user["cpf"] == cpf)

  if (!customer) {
    return response.status(400).json({ error: "Customer not found" })
  }

  request.customer = customer

  return next()
}

function getBalance(statements) {
  return statements.reduce((acc, operation) => {
    if (operation["type"] == "credit") {
      return acc + operation["amount"]
    } else {
      return acc - operation["amount"]
    }
  }, 0)
}

app.post("/account", (request, response) => {
  const { cpf, name } = request.body
  const customerAlreadyExists = customers.some((user) => user["cpf"] == cpf)

  if (customerAlreadyExists) {
    return response.status(400).json({ error: "Customer already exists" })
  }

  customers.push({
    id: uuidv4(),
    cpf,
    name,
    statements: [],
  })
  return response.status(201).send()
})

app.get("/statement/", verifyIfExistsAccountByCPF, (request, response) => {
  const { customer } = request
  return response.json({ statements: customer["statements"] })
})

app.post("/deposit", verifyIfExistsAccountByCPF, (request, response) => {
  const { description, amount } = request.body
  const { customer } = request
  customer["statements"].push({
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  })
  return response.status(201).send()
})

app.post("/withdraw", verifyIfExistsAccountByCPF, (request, response) => {
  const { amount } = request.body
  const { customer } = request
  if (getBalance(customer["statements"]) < amount) {
    return response.status(400).json({ error: "Insufficient funds" })
  }
  customer["statements"].push({
    amount,
    created_at: new Date(),
    type: "debit",
  })
  return response.send()
})

app.get("/statement/date", verifyIfExistsAccountByCPF, (request, response) => {
  const { customer } = request
  const { date } = request.query
  const dateFormat = new Date(date + " 00:00")

  const statement = customer["statements"].filter(
    (statement) =>
      statement["created_at"].toDateString() ===
      new Date(dateFormat).toDateString()
  )

  return response.json(statement)
})

app.put("/account", verifyIfExistsAccountByCPF, (request, response) => {
  const { name } = request.body
  const { customer } = request
  customer["name"] = name
  return response.status(201).send()
})

app.get("/account", verifyIfExistsAccountByCPF, (request, response) => {
  const { customer } = request
  return response.json(customer)
})

app.listen(3333)
