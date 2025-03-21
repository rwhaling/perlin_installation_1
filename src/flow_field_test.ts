import p5 from "p5";

// Parameter definitions moved from main.tsx to here
export const numericParameterDefs = {
  "timeMultiplier": {
    "min": 0,
    "max": 0.01,
    "step": 0.00001,
    "defaultValue": 0.00005, // Set to match initial value
  },
  "noiseSize": {
    "min": 0,
    "max": 100,
    "step": 1,
    "defaultValue": 80,
  },
  "noiseScale": {
    "min": 0,
    "max": 0.1,
    "step": 0.0001,
    "defaultValue": 0.0168,
  },
  "noiseDetailOctave": {
    "min": 0,
    "max": 10,
    "step": 1,
    "defaultValue": 3,
  },
  "noiseDetailFalloff": {
    "min": 0,
    "max": 1,
    "step": 0.05,
    "defaultValue": 0.45,
  },
  "particleFrequency": {
    "min": 0,
    "max": 360,
    "step": 4,
    "defaultValue": 10, // Set to match initial value
  },
  "gridTransparency": {
    "min": 0,
    "max": 255,
    "step": 1,
    "defaultValue": 24,
  },
  "trailTransparency": {
    "min": 0,
    "max": 255,
    "step": 1,
    "defaultValue": 17,
  },
  "gridSize": {
    "min": 10,
    "max": 50,
    "step": 1,
    "defaultValue": 25,
  },
  // New parameters for particle behavior
  "particleMaxCount": {
    "min": 50,
    "max": 1000, 
    "step": 10,
    "defaultValue": 300,
  },
  "particleForceStrength": {
    "min": 0.01,
    "max": 0.5,
    "step": 0.01,
    "defaultValue": 0.27,
  },
  "particleMaxSpeed": {
    "min": 0.5,
    "max": 5,
    "step": 0.1,
    "defaultValue": 3.4,
  },
  "particleTrailWeight": {
    "min": 1,
    "max": 5,
    "step": 0.5,
    "defaultValue": 2,
  },
};

// This type represents the parameter store structure
export type ParameterStore = {
  [K in keyof typeof numericParameterDefs]: number;
};

// Create initialization function here too
export function initParameterStore(): ParameterStore {
  // Initialize from default values in the parameter definitions
  const store = {} as ParameterStore;
  
  Object.entries(numericParameterDefs).forEach(([key, def]) => {
    store[key as keyof ParameterStore] = def.defaultValue;
  });
  
  return store;
}

// This function creates the p5 sketch
export function createSketch(parameterStore: ParameterStore) {
  return function sketch(p: p5) {
    let font: p5.Font;
    // Create a separate graphics layer for particles
    let particleLayer: p5.Graphics;
    let gridLayer: p5.Graphics;
    let particleMask: p5.Graphics;
    
    // Improved particle structure with vectors and previous position
    interface SimpleParticle {
      pos: p5.Vector;
      vel: p5.Vector;
      acc: p5.Vector;
      prevPos: p5.Vector;
    }
    
    // Array to store particles
    let particles: SimpleParticle[] = [];
    
    p.preload = function() {
      // can preload assets here...
      font = p.loadFont(
        new URL("/public/fonts/inconsolata.otf", import.meta.url).href
      );
    };
    
    p.setup = function() {
      p.createCanvas(500, 500, p.WEBGL);
      // Create particle layer with same dimensions and renderer
      particleLayer = p.createGraphics(500, 500, p.WEBGL);
      particleLayer.setAttributes({ alpha: true });
      particleMask = p.createGraphics(500, 500, p.WEBGL);
      particleMask.setAttributes({ alpha: true });
      particleMask.fill("#FFFFFFDD");
      particleMask.rect(0, 0, 500, 500);
      gridLayer = p.createGraphics(500, 500, p.WEBGL);      
      // p.background("#FFF8E6");
      // ...
    };
    
    // Create a new particle with vector properties
    function createParticle(x: number, y: number): SimpleParticle {
      const pos = p.createVector(x, y);
      return {
        pos: pos,
        vel: p.createVector(0, 0),
        acc: p.createVector(0, 0),
        prevPos: pos.copy()
      };
    }
    
    // Update particle physics
    function updateParticle(particle: SimpleParticle, flowAngle: number): void {
      // Save previous position for drawing
      particle.prevPos.set(particle.pos);
      
      // Create a force vector from the flow field angle
      const force = p5.Vector.fromAngle(flowAngle);
      force.mult(parameterStore.particleForceStrength); // Force magnitude from parameters
      
      // Apply force to acceleration
      particle.acc.add(force);
      
      // Update velocity with acceleration
      particle.vel.add(particle.acc);
      
      // Limit velocity to prevent excessive speed - use parameter
      particle.vel.limit(parameterStore.particleMaxSpeed);
      
      // Update position with velocity
      particle.pos.add(particle.vel);
      
      // Reset acceleration for next frame
      particle.acc.mult(0);
      
      // Handle edges by wrapping around
      if (particle.pos.x < -p.width/2) {
        particle.pos.x = p.width/2;
        particle.prevPos.x = p.width/2;
      }
      if (particle.pos.x > p.width/2) {
        particle.pos.x = -p.width/2;
        particle.prevPos.x = -p.width/2;
      }
      if (particle.pos.y < -p.height/2) {
        particle.pos.y = p.height/2;
        particle.prevPos.y = p.height/2;
      }
      if (particle.pos.y > p.height/2) {
        particle.pos.y = -p.height/2;
        particle.prevPos.y = -p.height/2;
      }
    }
    
    p.draw = function() {
      let timeMultiplier = parameterStore.timeMultiplier;
      let noiseSize = parameterStore.noiseSize;
      let noiseScale = parameterStore.noiseScale;
      let falloff = parameterStore.noiseDetailFalloff;
      let octaves = parameterStore.noiseDetailOctave;
      let particleFrequency = parameterStore.particleFrequency;
      let gridSize = parameterStore.gridSize;
      let gridTransparency = parameterStore.gridTransparency;
   
      // p.clear();

      // Set noise detail for both canvases
      p.noiseDetail(octaves, falloff);
      gridLayer.noiseDetail(octaves, falloff);
      particleLayer.noiseDetail(octaves, falloff);

      // Clear the particle layer each frame with transparent background
      // particleLayer.clear();

      // Instead of clearing, draw a semi-transparent black rectangle
      // that partially obscures previous frames
      gridLayer.push();
      gridLayer.translate(-p.width/2, -p.height/2); // Move to top-left in WEBGL mode
      
      // Convert blurAmount to hex and use it for the alpha value
      let alphaHex = Math.floor(gridTransparency).toString(16).padStart(2, '0');
      gridLayer.fill(`#FFF8E6${alphaHex}`); // 
      
      gridLayer.noStroke();
      gridLayer.rect(0, 0, p.width, p.height);
      gridLayer.pop();
      
      // get the current time
      let time = p.millis() * timeMultiplier;
      
      // Calculate dimensions and offsets for WEBGL coordinate system
      const insetPercentage = 0.2; // 20% inset on each side
      const startX = -p.width/2 * (1 - insetPercentage);
      const startY = -p.height/2 * (1 - insetPercentage);
      const endX = p.width/2 * (1 - insetPercentage);
      const endY = p.height/2 * (1 - insetPercentage);
      const noiseOffsetX = p.width/2;  // Offset for consistent noise sampling
      const noiseOffsetY = p.height/2;
      
      // Calculate step size based on available width/height and gridSize
      const availableWidth = endX - startX;
      const availableHeight = endY - startY;
      // Use half as many cells to give each vector more space
      const stepsX = Math.ceil(gridSize / 2); 
      const stepsY = Math.ceil(gridSize / 2);
      const stepSizeX = availableWidth / stepsX;
      const stepSizeY = availableHeight / stepsY;
      
      // Draw flow field vectors on main canvas
      for (let x = startX + stepSizeX/2; x <= endX; x += stepSizeX) {
        for (let y = startY + stepSizeY/2; y <= endY; y += stepSizeY) {
          let angle = p.noise((x + noiseOffsetX) * noiseScale, (y + noiseOffsetY) * noiseScale, time);
          let angleRadians = 2 * angle * Math.PI * 2;
          let x1 = x + (stepSizeX * 0.5) * Math.cos(angleRadians);
          let y1 = y + (stepSizeY * 0.5) * Math.sin(angleRadians);
          
          // Set explicit stroke color and weight before drawing the line
          gridLayer.stroke("#D6CFB4"); // Ensure stroke is black and visible
          gridLayer.strokeWeight(1);
          
          // Draw the line
          gridLayer.line(x, y, x1, y1);
          
          // Draw a 2px circle at the end of the vector
          gridLayer.noStroke();
          gridLayer.fill("#D6CFB4"); // Ensure the circle is white
          // p.circle(x1, y1, 4);
        }
      }

      // After drawing the vector field, handle particles
      
      // Chance to spawn a new particle
      if (p.random(100) < 100/particleFrequency) {
        // Create particle at random position
        particles.push(createParticle(
          p.random(startX, endX),
          p.random(startY, endY)
        ));
      }
      
      // Maximum number of particles - now from parameters
      while (particles.length > parameterStore.particleMaxCount) {
        particles.shift(); // Remove oldest particles if we have too many
      }
      
      // Draw particles to the particle layer
      particleLayer.push();
      particleLayer.noStroke();
      particleLayer.blendMode(p.REMOVE as any);

      // draw a rectangle over the whole canvase with the trail transparency
      // particleLayer.tint(255,parameterStore.trailTransparency);
      particleLayer.fill("#FFFFFF" + parameterStore.trailTransparency.toString(16).padStart(2, '0'));
      // particleLayer.fill("#FFFFFF04");

      particleLayer.rect(-particleLayer.width/2, -particleLayer.height/2, particleLayer.width, particleLayer.height);
      
      // Update and draw all particles on the particle layer
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        
        // Get noise angle at current position (same as in the grid)
        let noiseValue = p.noise(
          (particle.pos.x + noiseOffsetX) * noiseScale, 
          (particle.pos.y + noiseOffsetY) * noiseScale, 
          time
        );
        let angleRadians = 2 * noiseValue * Math.PI * 2;
        
        // Update particle physics based on flow field
        updateParticle(particle, angleRadians);
        
        // Draw the particle on the particle layer
        particleLayer.blendMode(p.BLEND);

        particleLayer.fill("#8D0B41");
        particleLayer.stroke("#8D0B41");
        particleLayer.strokeWeight(parameterStore.particleTrailWeight); // Adjustable trail weight
        particleLayer.line(
          particle.prevPos.x, particle.prevPos.y,
          particle.pos.x, particle.pos.y
        );
        
        particleLayer.noStroke();
        particleLayer.fill("#8D0B41");
        particleLayer.circle(particle.pos.x, particle.pos.y, parameterStore.particleTrailWeight);
      }
      particleLayer.pop();
      
      // Overlay the particle layer on the main canvas
      p.push();
      p.translate(-p.width/2, -p.height/2); // Move to top-left for image drawing
      p.imageMode(p.CORNER);
      p.blendMode(p.BLEND);
      p.image(gridLayer, 0, 0, p.width, p.height);
      p.image(particleLayer, 0, 0, p.width, p.height);
      p.pop();
    };
  };
}