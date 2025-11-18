import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home">
      <section className="hero">
        <div className="container text-center py-5">
          <h1 className="display-4">Find Your Perfect Roommate Today</h1>
          <p className="lead">Connect with compatible roommates and find your ideal living situation</p>
          <div className="mt-4">
            <Link to="/register" className="btn btn-primary btn-lg me-3">Get Started</Link>
            <Link to="/login" className="btn btn-outline-primary btn-lg">Login</Link>
          </div>
        </div>
      </section>

      <section className="features py-5 bg-light">
        <div className="container">
          <div className="row text-center">
            <div className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="card-body">
                  <h3>Easy Matching</h3>
                  <p>Our smart algorithm helps you find roommates based on your preferences and lifestyle.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="card-body">
                  <h3>Safe & Secure</h3>
                  <p>We verify all users to ensure a safe and trustworthy community.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="card-body">
                  <h3>Save Money</h3>
                  <p>Split rent and utilities with your perfect roommate match.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
