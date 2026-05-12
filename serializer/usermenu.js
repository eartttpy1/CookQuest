const mongoose = require('mongoose');

const userMenuSchema = new mongoose.Schema({
  menuName: {
    type: String,
    required: true
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
  }]
}, 
{   
  timestamps: true,
  collection: 'userMenu'
}
);

module.exports = mongoose.model('userMenu', menuItemSchema);    