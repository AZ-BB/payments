import { useState, useRef, useEffect } from 'react'
import './Autocomplete.css'

function Autocomplete({ 
  value, 
  onChange, 
  options = [], 
  placeholder = '',
  id,
  name,
  className = '',
  error = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredOptions, setFilteredOptions] = useState(options)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (value) {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredOptions(filtered)
    } else {
      setFilteredOptions(options)
    }
    setHighlightedIndex(-1)
  }, [value, options])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    onChange(e)
    
    if (newValue) {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(newValue.toLowerCase())
      )
      setFilteredOptions(filtered)
      setIsOpen(true)
    } else {
      setFilteredOptions(options)
      setIsOpen(true)
    }
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleSelectOption = (option) => {
    const syntheticEvent = {
      target: {
        name: name,
        value: option
      }
    }
    onChange(syntheticEvent)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (!isOpen || filteredOptions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div className="autocomplete-wrapper">
      <input
        ref={inputRef}
        type="text"
        id={id}
        name={name}
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`autocomplete-input ${className} ${error ? 'error' : ''}`}
        autoComplete="off"
      />
      {isOpen && filteredOptions.length > 0 && (
        <div ref={dropdownRef} className="autocomplete-dropdown">
          {filteredOptions.map((option, index) => (
            <div
              key={index}
              className={`autocomplete-option ${
                index === highlightedIndex ? 'highlighted' : ''
              }`}
              onClick={() => handleSelectOption(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Autocomplete

