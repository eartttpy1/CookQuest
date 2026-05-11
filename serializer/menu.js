const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  menuName: {
    type: String,
    required: true
  },
  rank:{
    type: String,
    enum: ['bronze','silver','gold','platinum','diamond','master'],
    default: 'bronze'
  },
  servings: {
    type: Number,
    default: 1
  },
  prepTime: {
    type: String,
    default: ''
  },
  cookTime: {
    type: String,
    default: ''
  },
  EXP: {
    type: Number,
    default: 0
  },
  prepareTime: {
    type: Number,
    default: 0
  },
  cookingTime: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: String,
    default: ''
  },
  imageURL: {
    type: String,
    default: ''
  },
  ingredients: [{
    name: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    }
  }],
  instructions: [{
    stepNumber: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    stepImageURL: {
      type: String,
      default: ''
    }
  }],
  tags: [{
    type: String
  }],
  questIds: [{
    type: String
  }],
}, {
  timestamps: true
});

module.exports = mongoose.model('Menu', menuSchema);